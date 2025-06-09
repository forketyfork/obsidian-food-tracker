import { SPECIAL_CHARS_REGEX, LEADING_NUMBER_REGEX } from "./constants";

export interface SuggestionTrigger {
	query: string;
	startOffset: number;
	endOffset: number;
	context?: "measure" | "nutrition";
}

export interface NutrientProvider {
	getNutrientNames(): string[];
	getFileNameFromNutrientName(nutrientName: string): string | null;
}

export class FoodSuggestionCore {
	private foodTag: string;
	private nutritionKeywords = ["kcal", "fat", "prot", "carbs", "sugar"];
	private measureKeywords = ["g", "ml", "kg", "l", "oz", "lb", "cup", "tbsp", "tsp"];

	// Precompiled regex patterns for performance
	private foodTagRegex: RegExp;
	private nutritionQueryRegex: RegExp;
	private nutritionValidationRegex: RegExp;
	private foodWithMeasureRegex: RegExp;

	constructor(foodTag: string) {
		this.foodTag = foodTag;
		this.updateFoodTagRegex();
		this.nutritionQueryRegex = /.*\s+(\d+[a-z]*)$/;
		this.nutritionValidationRegex = /^\d+[a-z]*$/;
		this.foodWithMeasureRegex = /\[\[[^\]]+\]\]\s+(\d+[a-z]*)$/;
	}

	updateFoodTag(foodTag: string): void {
		this.foodTag = foodTag;
		this.updateFoodTagRegex();
	}

	private updateFoodTagRegex(): void {
		const escapedFoodTag = this.foodTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
		this.foodTagRegex = new RegExp(`#${escapedFoodTag}\\s+(.*)$`);
	}

	/**
	 * Analyzes a line of text to determine if food suggestions should be triggered
	 * @param line The full line of text
	 * @param cursorPosition The cursor position within the line
	 * @returns SuggestionTrigger if suggestions should be shown, null otherwise
	 */
	analyzeTrigger(line: string, cursorPosition: number): SuggestionTrigger | null {
		// Early exit if cursor is at beginning of line
		if (cursorPosition === 0) return null;

		// Check if line contains food tag using precompiled regex
		if (!this.foodTagRegex.test(line.substring(0, cursorPosition))) return null;

		// Use substring only when necessary and match with precompiled regex
		const beforeCursor = line.substring(0, cursorPosition);
		const foodMatch = this.foodTagRegex.exec(beforeCursor);
		if (!foodMatch) return null;

		const query = foodMatch[1] || "";

		// Check if we're typing after a food wikilink (measure context)
		const foodWithMeasureMatch = this.foodWithMeasureRegex.exec(query);
		if (foodWithMeasureMatch) {
			const measureQuery = foodWithMeasureMatch[1];
			// Only trigger measure suggestions if we have a number followed by letters
			if (this.nutritionValidationRegex.test(measureQuery)) {
				return {
					query: measureQuery,
					startOffset: cursorPosition - measureQuery.length,
					endOffset: cursorPosition,
					context: "measure",
				};
			}
		}

		// Check if we're in the context of typing nutritional values (not after wikilink)
		const nutritionMatch = this.nutritionQueryRegex.exec(query);
		if (nutritionMatch && !this.foodWithMeasureRegex.test(query)) {
			const nutritionQuery = nutritionMatch[1];
			// Only trigger nutrition suggestions if we have a number followed by letters
			if (this.nutritionValidationRegex.test(nutritionQuery)) {
				return {
					query: nutritionQuery,
					startOffset: cursorPosition - nutritionQuery.length,
					endOffset: cursorPosition,
					context: "nutrition",
				};
			}
		}

		// Regular food name autocomplete
		return {
			query: query,
			startOffset: cursorPosition - query.length,
			endOffset: cursorPosition,
		};
	}

	/**
	 * Generates suggestions based on a query and context
	 * @param query The search query
	 * @param nutrientProvider Provider for nutrient data
	 * @param context The context type (measure, nutrition, or undefined for food names)
	 * @returns Array of suggestion strings
	 */
	getSuggestions(query: string, nutrientProvider: NutrientProvider, context?: "measure" | "nutrition"): string[] {
		const lowerQuery = query.toLowerCase();

		// Check if we're suggesting measures or nutritional keywords (must start with a digit)
		if (this.nutritionValidationRegex.test(lowerQuery)) {
			const keywords = context === "measure" ? this.measureKeywords : this.nutritionKeywords;
			const matchingKeywords = keywords.filter(keyword =>
				keyword.toLowerCase().startsWith(lowerQuery.replace(LEADING_NUMBER_REGEX, ""))
			);

			if (matchingKeywords.length > 0) {
				// Extract the number part
				const numberMatch = LEADING_NUMBER_REGEX.exec(lowerQuery);
				const numberPart = numberMatch ? numberMatch[0] : "";

				return matchingKeywords.map(keyword => numberPart + keyword);
			}
		}

		// Regular food name suggestions
		const nutrientNames = nutrientProvider.getNutrientNames();
		if (!lowerQuery) {
			return nutrientNames;
		}

		return nutrientNames.filter(name => name.toLowerCase().includes(lowerQuery));
	}

	/**
	 * Determines if a suggestion is a nutrition keyword or measure keyword
	 * @param suggestion The suggestion string
	 * @returns true if it's a nutrition keyword or measure keyword, false otherwise
	 */
	isNutritionKeyword(suggestion: string): boolean {
		// Check if the suggestion ends with a nutrition or measure keyword
		return (
			this.nutritionKeywords.some(keyword => suggestion.endsWith(keyword)) ||
			this.measureKeywords.some(keyword => suggestion.endsWith(keyword))
		);
	}

	/**
	 * Generates the replacement text for a food name suggestion
	 * @param nutrientName The selected nutrient name
	 * @param nutrientProvider Provider for nutrient data
	 * @returns The replacement text
	 */
	getFoodNameReplacement(nutrientName: string, nutrientProvider: NutrientProvider): string {
		const fileName = nutrientProvider.getFileNameFromNutrientName(nutrientName);
		return `[[${fileName ?? nutrientName}]]`;
	}

	/**
	 * Generates the replacement text for a nutrition keyword
	 * @param nutritionKeyword The selected nutrition keyword
	 * @returns The replacement text with a trailing space
	 */
	getNutritionKeywordReplacement(nutritionKeyword: string): string {
		return nutritionKeyword + " ";
	}
}
