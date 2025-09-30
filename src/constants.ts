/**
 * Shared regex patterns and constants used throughout the Food Tracker plugin
 * Centralized for performance optimization and maintainability
 */

// ================================
// Basic regex patterns for escaping and parsing
// ================================

/** Regex to escape special characters in strings for use in regex */
export const SPECIAL_CHARS_REGEX = /[.*+?^${}()|[\]\\]/g;

/** Regex to extract leading numbers from strings (e.g., "100g" -> "100") */
export const LEADING_NUMBER_REGEX = /^\d+/;

// ================================
// Individual nutrition value parsing patterns
// ================================

/** Matches calories with optional decimals (e.g., "300kcal", "150.5kcal") */
export const CALORIES_REGEX = /(\d+(?:\.\d+)?)kcal/i;

/** Matches fats with optional decimals (e.g., "25fat", "12.5fat") */
export const FATS_REGEX = /(\d+(?:\.\d+)?)fat/i;

/** Matches protein with optional decimals (e.g., "30prot", "15.2prot") */
export const PROTEIN_REGEX = /(\d+(?:\.\d+)?)prot/i;

/** Matches carbohydrates with optional decimals (e.g., "45carbs", "22.3carbs") */
export const CARBS_REGEX = /(\d+(?:\.\d+)?)carbs/i;

/** Matches sugar with optional decimals (e.g., "10sugar", "5.5sugar") */
export const SUGAR_REGEX = /(\d+(?:\.\d+)?)sugar/i;

// ================================
// File and content validation patterns
// ================================

/** Regex to identify invalid characters for filenames (preserves German umlauts and Eszett) */
export const INVALID_FILENAME_CHARS_REGEX = /[^a-zA-Z0-9äöüÄÖÜß]/g;

/** Lookup map for German umlaut and Eszett conversion - created once for performance */
const UMLAUT_MAP: Record<string, string> = {
	ü: "ue",
	ä: "ae",
	ö: "oe",
	Ü: "Ue",
	Ä: "Ae",
	Ö: "Oe",
	ß: "ss",
};

/**
 * Converts German umlauts and Eszett to their letter equivalents for filename safety
 * while preserving readability. Uses single regex pass for optimal performance.
 *
 * @param text - The text containing potential umlauts or Eszett
 * @returns Text with umlauts converted to letter pairs
 */
export const convertGermanUmlauts = (text: string): string => {
	return text.replace(/[üäöÜÄÖß]/g, match => UMLAUT_MAP[match]);
};

// ================================
// Factory functions for dynamic regex creation
// ================================

/**
 * Creates a fresh regex instance to match any nutrition value
 * Factory function prevents global state issues with regex lastIndex
 *
 * @returns RegExp that matches nutrition values like "300kcal", "25prot", etc.
 */
export const createNutritionValueRegex = () => /\d+(?:\.\d+)?(?:kcal|fat|prot|carbs|sugar|fiber|sodium)/gi;

// ================================
// Food entry parsing factory functions
// ================================

/**
 * Creates regex to match inline nutrition entries (not using wikilinks)
 *
 * @param escapedFoodTag - The escaped food tag
 * @returns RegExp that matches entries like "#food Chicken 300kcal 25prot"
 *
 * @example
 * ```typescript
 * const regex = createInlineNutritionRegex("food");
 * // Matches: "#food Grilled Chicken 300kcal 25prot 5fat"
 * // Captures: ["Grilled Chicken", "300kcal 25prot 5fat"]
 * ```
 */
export const createInlineNutritionRegex = (escapedFoodTag: string) =>
	new RegExp(
		`#${escapedFoodTag}\\s+(?!\\[\\[)([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar|fiber|sodium)(?:\\s+\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar|fiber|sodium))*)`,
		"i"
	);

/**
 * Creates regex to match linked food entries with amounts
 *
 * @param escapedFoodTag - The escaped food tag
 * @returns RegExp that matches entries like "#food [[Chicken]] 200g"
 *
 * @example
 * ```typescript
 * const regex = createLinkedFoodRegex("food");
 * // Matches: "#food [[Chicken Breast]] 200g"
 * // Captures: ["Chicken Breast", "200", "g"]
 * ```
 */
export const createLinkedFoodRegex = (escapedFoodTag: string) =>
	new RegExp(
		`#${escapedFoodTag}\\s+\\[\\[([^\\]]+)\\]\\]\\s+(\\d+(?:\\.\\d+)?)(kg|lb|cups?|tbsp|tsp|ml|oz|g|l|pcs?)`,
		"i"
	);

/**
 * Creates regex to match linked food entries for highlighting
 *
 * @param escapedFoodTag - The escaped food tag
 * @returns RegExp that matches linked food entries with amounts
 *
 * @example
 * ```typescript
 * const regex = createLinkedFoodHighlightRegex("food");
 * // Matches: "#food [[Apple]] 150g"
 * // Captures: ["150g"]
 * ```
 */
export const createLinkedFoodHighlightRegex = (escapedFoodTag: string) =>
	new RegExp(`#${escapedFoodTag}\\s+\\[[^\\]]+\\]\\]\\s+(\\d+(?:\\.\\d+)?(?:kg|lb|cups?|tbsp|tsp|ml|oz|g|l|pcs))`, "i");

// ================================
// Advanced highlighting regex patterns
// ================================

/**
 * Creates a regex pattern for inline nutrition entries (internal helper)
 * Example: "#food Chicken Breast 300kcal 25prot 5fat"
 */
const createInlineNutritionPattern = () =>
	`(?!\\[\\[)(?<foodName>[^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?<nutritionValues>\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar|fiber|sodium)(?:\\s+\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar|fiber|sodium))*)`;

/**
 * Creates a regex pattern for linked food entries with amounts (internal helper)
 * Example: "#food [[Chicken]] 200g"
 */
const createLinkedFoodPattern = () =>
	`\\[\\[[^\\]]+\\]\\]\\s+(?<amountValue>\\d+(?:\\.\\d+)?(?:kg|lb|cups?|tbsp|tsp|ml|oz|g|l|pcs))`;
/**
 * Combined regex for food highlighting that matches both inline nutrition and linked food patterns
 * Uses named capture groups to distinguish between different match types
 *
 * @param escapedFoodTag - The escaped food tag (e.g., "food" or "food\\-tracker")
 * @returns RegExp that matches food entries and captures relevant parts
 *
 * @example
 * ```typescript
 * const regex = createCombinedFoodHighlightRegex("food");
 * // Matches: "#food Chicken 300kcal 25prot" (captures nutritionValues)
 * // Matches: "#food [[Apple]] 150g" (captures amountValue)
 * ```
 */
export const createCombinedFoodHighlightRegex = (escapedFoodTag: string) => {
	const inlinePattern = createInlineNutritionPattern();
	const linkedPattern = createLinkedFoodPattern();

	return new RegExp(`#${escapedFoodTag}\\s+(?:${inlinePattern}|${linkedPattern})`, "i");
};
