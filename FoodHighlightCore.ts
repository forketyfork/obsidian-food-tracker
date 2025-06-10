import { createNutritionValueRegex, createCombinedFoodHighlightRegex } from "./constants";

export interface HighlightRange {
	start: number;
	end: number;
	type: "nutrition" | "amount";
}

export interface HighlightOptions {
	escapedFoodTag: string;
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
	const combinedRegex = createCombinedFoodHighlightRegex(options.escapedFoodTag);

	const match = combinedRegex.exec(text);
	if (match?.groups && match.index !== undefined) {
		const fullMatchIndex = match.index;

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
				ranges.push({
					start: valueStart,
					end: valueEnd,
					type: "nutrition",
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
