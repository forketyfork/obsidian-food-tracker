/**
 * Shared regex patterns and constants used throughout the Food Tracker plugin
 * Centralized for performance optimization and maintainability
 */

// ================================
// Basic regex patterns for escaping and parsing
// ================================

/** Regex to escape special characters in strings for use in regex */
export const SPECIAL_CHARS_REGEX = /[.*+?^${}()|[\]\\]/g;

/** Regex to extract leading numbers from strings (e.g., "100g" -> "100", "-100kcal" -> "-100") */
export const LEADING_NUMBER_REGEX = /^-?\d+/;

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
export const createNutritionValueRegex = () => /-?\d+(?:\.\d+)?(?:kcal|fat|satfat|prot|carbs|sugar|fiber|sodium)/gi;

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
		`#${escapedFoodTag}\\s+(?!\\[\\[)([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(-?\\d+(?:\\.\\d+)?(?:kcal|fat|satfat|prot|carbs|sugar|fiber|sodium)(?:\\s+-?\\d+(?:\\.\\d+)?(?:kcal|fat|satfat|prot|carbs|sugar|fiber|sodium))*)`,
		"i"
	);

const createFoodLinkPattern = () => `(?:\\[\\[(?<wikiLink>[^\\]]+)\\]\\]|\\[[^\\]]*\\]\\((?<markdownLink>[^)]+)\\))`;

/**
 * Creates regex to match linked food entries with amounts
 *
 * @param escapedFoodTag - The escaped food tag
 * @returns RegExp that matches entries like "#food [[Chicken]] 200g"
 *
 * @example
 * ```typescript
 * const regex = createLinkedFoodRegex("food");
 * // Matches: "#food [[Chicken Breast]] 200g" or markdown style links
 * // Captures: ["Chicken Breast" | "path/to/Chicken.md", "200", "g"]
 * ```
 */
export const createLinkedFoodRegex = (escapedFoodTag: string) =>
	new RegExp(
		`#${escapedFoodTag}\\s+${createFoodLinkPattern()}\\s+(?<amount>\\d+(?:\\.\\d+)?)(?<unit>kg|lb|cups?|tbsp|tsp|ml|oz|g|l|pcs?)`,
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
	new RegExp(
		`#${escapedFoodTag}\\s+${createFoodLinkPattern()}\\s+(\\d+(?:\\.\\d+)?(?:kg|lb|cups?|tbsp|tsp|ml|oz|g|l|pcs))`,
		"i"
	);

// ================================
// Advanced highlighting regex patterns
// ================================

/**
 * Creates a regex pattern for inline nutrition entries (internal helper)
 * Example: "#food Chicken Breast 300kcal 25prot 5fat"
 */
const createInlineNutritionPattern = () =>
	`(?!\\[\\[)(?<foodName>[^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?<nutritionValues>-?\\d+(?:\\.\\d+)?(?:kcal|fat|satfat|prot|carbs|sugar|fiber|sodium)(?:\\s+-?\\d+(?:\\.\\d+)?(?:kcal|fat|satfat|prot|carbs|sugar|fiber|sodium))*)`;

/**
 * Creates a regex pattern for linked food entries with amounts (internal helper)
 * Example: "#food [[Chicken]] 200g"
 */
const createLinkedFoodPattern = () =>
	`${createFoodLinkPattern()}\\s+(?<amountValue>\\d+(?:\\.\\d+)?(?:kg|lb|cups?|tbsp|tsp|ml|oz|g|l|pcs?))`;
/**
 * Combined regex for food highlighting that matches both inline nutrition and linked food patterns
 * Uses named capture groups to distinguish between different match types
 * Supports both food and workout tags
 *
 * @param escapedFoodTag - The escaped food tag (e.g., "food" or "food\\-tracker")
 * @param escapedWorkoutTag - The escaped workout tag (e.g., "workout" or "workout\\-tag")
 * @returns RegExp that matches food entries and captures relevant parts
 *
 * @example
 * ```typescript
 * const regex = createCombinedFoodHighlightRegex("food", "workout");
 * // Matches: "#food Chicken 300kcal 25prot" (captures nutritionValues)
 * // Matches: "#food [[Apple]] 150g" (captures amountValue)
 * // Matches: "#workout training 300kcal" (captures nutritionValues)
 * ```
 */
export const createCombinedFoodHighlightRegex = (escapedFoodTag: string, escapedWorkoutTag: string) => {
	const inlinePattern = createInlineNutritionPattern();
	const linkedPattern = createLinkedFoodPattern();

	const tags = [escapedFoodTag, escapedWorkoutTag].filter(tag => tag.length > 0);
	if (tags.length === 0) {
		return /(?!.)/;
	}

	const tagAlternatives = tags.join("|");

	return new RegExp(`#(?<tag>${tagAlternatives})\\s+(?:${inlinePattern}|${linkedPattern})`, "i");
};

// ================================
// Barcode detection utilities
// ================================

/** Regex to match barcode formats (EAN-8, UPC-A, EAN-13, ITF-14) */
export const BARCODE_REGEX = /^\d{8,14}$/;

/**
 * Checks if input looks like a barcode (8-14 digits)
 * Supports EAN-8, UPC-A (12), EAN-13, and ITF-14 formats
 *
 * @param input - The string to check
 * @returns true if the input matches barcode format
 *
 * @example
 * ```typescript
 * isBarcode("3017624010701") // true (EAN-13)
 * isBarcode("12345678") // true (EAN-8)
 * isBarcode("Nutella") // false
 * isBarcode("123") // false (too short)
 * ```
 */
export function isBarcode(input: string): boolean {
	return BARCODE_REGEX.test(input.trim());
}

// ================================
// Unit conversion utilities
// ================================

/**
 * Converts various units to a multiplier based on 100g servings
 * Handles weight and volume conversions with reasonable approximations
 * Volume units (cups, tbsp, tsp) are converted assuming water density (1ml ≈ 1g)
 *
 * @param amount - The amount of the unit
 * @param unit - The unit to convert (g, kg, lb, cups, tbsp, tsp, ml, oz, l, pcs)
 * @param servingSize - Optional serving size in grams for piece-based units
 * @returns The multiplier to apply to nutrition values (based on 100g)
 *
 * @example
 * ```typescript
 * const multiplier = getUnitMultiplier(200, "g"); // Returns 2
 * const multiplier = getUnitMultiplier(1, "cup"); // Returns 2.4
 * const multiplier = getUnitMultiplier(2, "pcs", 50); // Returns 1 (2 pieces * 50g / 100)
 * ```
 */
export function getUnitMultiplier(amount: number, unit: string, servingSize?: number): number {
	const baseAmount = 100;

	switch (unit.toLowerCase()) {
		case "g":
			return amount / baseAmount;
		case "kg":
			return (amount * 1000) / baseAmount;
		case "ml":
			return amount / baseAmount;
		case "l":
			return (amount * 1000) / baseAmount;
		case "oz":
			return (amount * 28.35) / baseAmount;
		case "lb":
			return (amount * 453.6) / baseAmount;
		case "cup":
		case "cups":
			return (amount * 240) / baseAmount;
		case "tbsp":
			return (amount * 15) / baseAmount;
		case "tsp":
			return (amount * 5) / baseAmount;
		case "pc":
		case "pcs":
			const effectiveServingSize = servingSize && servingSize > 0 ? servingSize : 100;
			return (amount * effectiveServingSize) / baseAmount;
		default:
			return amount / baseAmount;
	}
}
