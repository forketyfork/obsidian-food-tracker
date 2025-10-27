import { createNutritionValueRegex, createCombinedFoodHighlightRegex } from "./constants";

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
 * Extracts inline calorie annotations for food entries measured in grams
 * Returns the document position where the annotation should be inserted and the formatted calorie text
 */
export function extractInlineCalorieAnnotations(
	text: string,
	startOffset: number,
	options: HighlightOptions,
	calorieProvider: CalorieProvider
): CalorieAnnotation[] {
	const annotations: CalorieAnnotation[] = [];

	const gramsRegex = new RegExp(`#${options.escapedFoodTag}\\s+\\[\\[([^\\]]+)\\]\\]\\s+(\\d+(?:\\.\\d+)?)(g)`, "gi");

	for (const match of text.matchAll(gramsRegex)) {
		const fullMatch = match[0];
		const rawFileName = match[1];
		const amountString = match[2];

		const amount = parseFloat(amountString);
		if (!isFinite(amount) || amount <= 0) {
			continue;
		}

		const normalizedFileName = rawFileName
			.split("|")[0]
			.split("#")[0]
			.split("/")
			.pop()?.trim();
		if (!normalizedFileName) {
			continue;
		}

		const caloriesPerHundred = calorieProvider.getCaloriesForFood(normalizedFileName);
		if (caloriesPerHundred === null || caloriesPerHundred === undefined || !isFinite(caloriesPerHundred)) {
			continue;
		}

		const calculatedCalories = (amount / 100) * caloriesPerHundred;
		if (!isFinite(calculatedCalories) || calculatedCalories <= 0) {
			continue;
		}

		const formattedCalories = Math.round(calculatedCalories);
		if (formattedCalories <= 0) {
			continue;
		}

		const position = startOffset + (match.index ?? 0) + fullMatch.length;
		annotations.push({
			position,
			text: `${formattedCalories}kcal`,
		});
	}

	return annotations;
}
