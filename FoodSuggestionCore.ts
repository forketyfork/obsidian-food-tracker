import { LEADING_NUMBER_REGEX } from "./constants";
import { SettingsService } from "./SettingsService";
import { Subscription } from "rxjs";

/**
 * Represents a trigger for showing food suggestions
 * Contains the query text and position information for replacement
 */
export interface SuggestionTrigger {
	query: string;
	startOffset: number;
	endOffset: number;
	context?: "measure" | "nutrition";
}

/**
 * Interface for providing nutrient data to the suggestion system
 * Used to simplify unit testing of the suggestion logic
 */
export interface NutrientProvider {
	getNutrientNames(): string[];
	getFileNameFromNutrientName(nutrientName: string): string | null;
}

export class FoodSuggestionCore {
	private settingsService: SettingsService;
	private subscription: Subscription;
	private nutritionKeywords = ["kcal", "fat", "prot", "carbs", "sugar"];
	private measureKeywords = ["g", "ml", "kg", "l", "oz", "lb", "cup", "tbsp", "tsp"];

	// Precompiled regex patterns for performance
	private foodTagRegex: RegExp;
	private nutritionQueryRegex: RegExp; // Matches text ending with number+letters (e.g., "apple 100g")
	private nutritionValidationRegex: RegExp; // Validates number+letters format (e.g., "100g")
	private foodWithMeasureRegex: RegExp; // Matches wikilink followed by number+letters

	constructor(settingsService: SettingsService) {
		this.settingsService = settingsService;

		// Initialize other regex patterns first
		// Match any text ending with space and number+letters
		this.nutritionQueryRegex = /.*\s+(\d+[a-z]*)$/;
		// Validate that text is just number+letters
		this.nutritionValidationRegex = /^\d+[a-z]*$/;
		// Match wikilink followed by space and number+letters
		this.foodWithMeasureRegex = /\[\[[^\]]+\]\]\s+(\d+[a-z]*)$/;

		// Initialize with current escaped food tag
		this.updateFoodTagRegex(this.settingsService.currentEscapedFoodTag);

		// Subscribe to escaped food tag changes and update regex
		this.subscription = this.settingsService.escapedFoodTag$.subscribe(escapedFoodTag => {
			this.updateFoodTagRegex(escapedFoodTag);
		});
	}

	/**
	 * Clean up subscriptions when the instance is destroyed
	 */
	destroy(): void {
		if (this.subscription) {
			this.subscription.unsubscribe();
		}
	}

	/**
	 * Updates the food tag regex when the escaped tag changes
	 */
	private updateFoodTagRegex(escapedFoodTag: string): void {
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
		// Example: "#food [[apple]] 100g" - suggests "g", "ml", etc.
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
		// Example: "#food apple 100k" - suggests "kcal", "kg", etc.
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

		// Handle measure/nutrition keyword suggestions (e.g., "100g" -> "100g", "100ml")
		if (this.nutritionValidationRegex.test(lowerQuery)) {
			const keywords = context === "measure" ? this.measureKeywords : this.nutritionKeywords;
			// Match keywords that start with the letter part of the query
			const matchingKeywords = keywords.filter(keyword =>
				keyword.toLowerCase().startsWith(lowerQuery.replace(LEADING_NUMBER_REGEX, ""))
			);

			if (matchingKeywords.length > 0) {
				// Extract the number part and prepend it to each keyword
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
