import { createNutritionValueRegex, createCombinedFoodHighlightRegex, getUnitMultiplier } from "./constants";
import { normalizeFilename } from "./NutritionCalculator";

export interface HighlightRange {
	start: number;
	end: number;
	type: "nutrition" | "amount" | "negative-kcal";
}

export interface CalorieAnnotation {
	position: number;
	text: string;
}

export interface CalorieProvider {
	getCaloriesForFood(fileName: string): number | null;
	getServingSize(fileName: string): number | null;
}

export interface HighlightOptions {
	escapedFoodTag: string;
	escapedWorkoutTag: string;
	foodTag: string;
	workoutTag: string;
}

/**
 * Extracts highlight ranges from text content for food entries
 * This is a pure function with no Obsidian dependencies for easy testing
 */
export function extractFoodHighlightRanges(
	text: string,
	lineStart: number,
	options: HighlightOptions
): HighlightRange[] {
	const ranges: HighlightRange[] = [];
	const combinedRegex = createCombinedFoodHighlightRegex(options.escapedFoodTag, options.escapedWorkoutTag);

	const match = combinedRegex.exec(text);
	if (match?.groups && match.index !== undefined) {
		const fullMatchIndex = match.index;

		const matchedTag = match.groups.tag?.toLowerCase() ?? "";
		const workoutTag = options.workoutTag.toLowerCase();
		const isWorkoutTag = workoutTag.length > 0 && matchedTag === workoutTag;

		if (match.groups.nutritionValues) {
			// Inline nutrition format: highlight each nutritional value
			const nutritionString = match.groups.nutritionValues;
			// Calculate the position of the nutrition values within the full match
			const textBeforeNutrition = match[0].indexOf(nutritionString);
			const nutritionStringStart = lineStart + fullMatchIndex + textBeforeNutrition;

			// Find and highlight each nutritional value within the nutrition string
			const nutritionValueRegex = createNutritionValueRegex();
			const allValueMatches = nutritionString.matchAll(nutritionValueRegex);

			for (const valueMatch of allValueMatches) {
				const valueStart = nutritionStringStart + valueMatch.index;
				const valueEnd = valueStart + valueMatch[0].length;
				const value = valueMatch[0];

				const isNegative = value.startsWith("-");
				const isKcal = value.toLowerCase().includes("kcal");

				// Skip negative workout calories (they're invalid and ignored in calculations)
				if (isWorkoutTag && isNegative && isKcal) {
					continue;
				}

				// Determine highlight type
				const isNegativeKcal = isNegative && isKcal;
				const isWorkoutKcal = isWorkoutTag && isKcal;

				ranges.push({
					start: valueStart,
					end: valueEnd,
					type: isNegativeKcal || isWorkoutKcal ? "negative-kcal" : "nutrition",
				});
			}
		} else if (match.groups.amountValue) {
			// Linked food format: highlight the amount
			const amountString = match.groups.amountValue;
			// Calculate the position of the amount value within the full match
			const textBeforeAmount = match[0].indexOf(amountString);
			const amountStart = lineStart + fullMatchIndex + textBeforeAmount;
			const amountEnd = amountStart + amountString.length;
			ranges.push({
				start: amountStart,
				end: amountEnd,
				type: "amount",
			});
		}
	}

	return ranges;
}

/**
 * Processes multiple lines of text and extracts all highlight ranges
 */
export function extractMultilineHighlightRanges(
	text: string,
	startOffset: number,
	options: HighlightOptions
): HighlightRange[] {
	const ranges: HighlightRange[] = [];
	const lines = text.split("\n");
	let lineStart = startOffset;

	for (const line of lines) {
		const lineRanges = extractFoodHighlightRanges(line, lineStart, options);
		ranges.push(...lineRanges);
		lineStart += line.length + 1; // +1 for newline
	}

	return ranges;
}

/**
 * Extracts inline calorie annotations for food and workout entries
 * Supports all unit types (g, kg, lb, cups, tbsp, tsp, ml, oz, l, pcs) and direct kcal entries
 * Returns the document position where the annotation should be inserted and the formatted calorie text
 * Annotations are always placed at the end of the line
 */
export function extractInlineCalorieAnnotations(
	text: string,
	startOffset: number,
	options: HighlightOptions,
	calorieProvider: CalorieProvider
): CalorieAnnotation[] {
	const annotations: CalorieAnnotation[] = [];

	const tags = [options.escapedFoodTag, options.escapedWorkoutTag].filter(tag => tag.length > 0);
	if (tags.length === 0) {
		return annotations;
	}

	const tagPattern = tags.join("|");
	const foodLinkPattern = `(?:\\[\\[(?<wikiLink>[^\\]]+)\\]\\]|\\[[^\\]]*\\]\\((?<markdownLink>[^)]+)\\))`;

	const linkedFoodRegex = new RegExp(
		`#(${tagPattern})\\s+${foodLinkPattern}\\s+(?<amount>\\d+(?:\\.\\d+)?)(?<unit>kg|lb|cups?|tbsp|tsp|ml|oz|g|l|pcs?)`,
		"gi"
	);

	const directKcalRegex = new RegExp(
		`#(${tagPattern})\\s+(?!\\[\\[)[^\\s]+(?:\\s+[^\\s]+)*?\\s+(\\d+(?:\\.\\d+)?)kcal`,
		"gi"
	);

	const lines = text.split("\n");
	let lineStartOffset = startOffset;

	for (const line of lines) {
		const lineEndOffset = lineStartOffset + line.length;

		for (const match of line.matchAll(linkedFoodRegex)) {
			const matchedTag = match[1].toLowerCase();
			const rawFileName = match.groups?.wikiLink ?? match.groups?.markdownLink ?? match[2];
			const amountString = match.groups?.amount ?? match[3];
			const unit = match.groups?.unit ?? match[4];

			const amount = parseFloat(amountString);
			if (!isFinite(amount) || amount <= 0) {
				continue;
			}

			const normalizedFileName = normalizeFilename(rawFileName);
			if (!normalizedFileName) {
				continue;
			}

			const caloriesPerHundred = calorieProvider.getCaloriesForFood(normalizedFileName);
			if (caloriesPerHundred === null || caloriesPerHundred === undefined || !isFinite(caloriesPerHundred)) {
				continue;
			}

			const servingSize = calorieProvider.getServingSize(normalizedFileName);
			const multiplier = getUnitMultiplier(amount, unit, servingSize ?? undefined);
			const calculatedCalories = multiplier * caloriesPerHundred;

			if (!Number.isFinite(calculatedCalories) || calculatedCalories < 0) {
				continue;
			}

			const formattedCalories = Math.round(calculatedCalories);
			if (!Number.isFinite(formattedCalories) || formattedCalories < 0) {
				continue;
			}

			const isWorkout = options.workoutTag.length > 0 && matchedTag === options.workoutTag.toLowerCase();
			const displayCalories = isWorkout ? -formattedCalories : formattedCalories;
			const normalizedCalories = displayCalories === 0 ? 0 : displayCalories;

			annotations.push({
				position: lineEndOffset,
				text: `${normalizedCalories}kcal`,
			});
		}

		for (const match of line.matchAll(directKcalRegex)) {
			const matchedTag = match[1].toLowerCase();
			const caloriesString = match[2];

			const calories = parseFloat(caloriesString);
			if (!Number.isFinite(calories) || calories < 0) {
				continue;
			}

			const formattedCalories = Math.round(calories);
			if (!Number.isFinite(formattedCalories) || formattedCalories < 0) {
				continue;
			}

			const isWorkout = options.workoutTag.length > 0 && matchedTag === options.workoutTag.toLowerCase();
			const displayCalories = isWorkout ? -formattedCalories : formattedCalories;
			const normalizedCalories = displayCalories === 0 ? 0 : displayCalories;

			annotations.push({
				position: lineEndOffset,
				text: `${normalizedCalories}kcal`,
			});
		}

		lineStartOffset = lineEndOffset + 1;
	}

	return annotations;
}
