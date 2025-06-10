/**
 * Shared regex patterns and constants used throughout the Food Tracker plugin
 * Centralized for performance optimization and maintainability
 */

// Regex patterns for escaping and parsing
export const SPECIAL_CHARS_REGEX = /[.*+?^${}()|[\]\\]/g;
export const LEADING_NUMBER_REGEX = /^\d+/;

// Nutrition value parsing patterns
export const CALORIES_REGEX = /(\d+(?:\.\d+)?)kcal/i;
export const FATS_REGEX = /(\d+(?:\.\d+)?)fat/i;
export const PROTEIN_REGEX = /(\d+(?:\.\d+)?)prot/i;
export const CARBS_REGEX = /(\d+(?:\.\d+)?)carbs/i;
export const SUGAR_REGEX = /(\d+(?:\.\d+)?)sugar/i;

// File naming constraints
export const INVALID_FILENAME_CHARS_REGEX = /[^a-zA-Z0-9]/g;

// Factory function to create fresh regex instances to avoid global state issues
export const createNutritionValueRegex = () => /\d+(?:\.\d+)?(?:kcal|fat|prot|carbs|sugar)/gi;

// Factory functions for food entry parsing patterns
export const createInlineNutritionRegex = (escapedFoodTag: string) =>
	new RegExp(
		`#${escapedFoodTag}\\s+(?!\\[\\[)([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar)(?:\\s+\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar))*)`,
		"i"
	);

export const createLinkedFoodRegex = (escapedFoodTag: string) =>
	new RegExp(`#${escapedFoodTag}\\s+\\[\\[([^\\]]+)\\]\\]\\s+(\\d+(?:\\.\\d+)?)(kg|lb|cups?|tbsp|tsp|ml|oz|g|l)`, "i");

export const createLinkedFoodHighlightRegex = (escapedFoodTag: string) =>
	new RegExp(
		`#${escapedFoodTag}\\s+(?:\\[\\[[^\\]]+\\]\\]|[^\\s]+)\\s+(\\d+(?:\\.\\d+)?(?:kg|lb|cups?|tbsp|tsp|ml|oz|g|l))`,
		"i"
	);

// Combined regex for food highlighting that matches both inline nutrition and linked food patterns
export const createCombinedFoodHighlightRegex = (escapedFoodTag: string) =>
	new RegExp(
		`#${escapedFoodTag}\\s+(?:` +
			// Inline nutrition pattern: captures nutrition values
			`(?!\\[\\[)(?<foodName>[^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?<nutritionValues>\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar)(?:\\s+\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar))*)|` +
			// Linked food pattern: captures amount values
			`(?:\\[\\[[^\\]]+\\]\\]|[^\\s]+)\\s+(?<amountValue>\\d+(?:\\.\\d+)?(?:kg|lb|cups?|tbsp|tsp|ml|oz|g|l))` +
			`)`,
		"i"
	);
