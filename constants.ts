// Shared regex patterns for performance optimization
export const SPECIAL_CHARS_REGEX = /[.*+?^${}()|[\]\\]/g;
export const LEADING_NUMBER_REGEX = /^\d+/;
export const CALORIES_REGEX = /(\d+(?:\.\d+)?)kcal/i;
export const FATS_REGEX = /(\d+(?:\.\d+)?)fat/i;
export const PROTEIN_REGEX = /(\d+(?:\.\d+)?)prot/i;
export const CARBS_REGEX = /(\d+(?:\.\d+)?)carbs/i;
export const SUGAR_REGEX = /(\d+(?:\.\d+)?)sugar/i;
export const INVALID_FILENAME_CHARS_REGEX = /[^a-zA-Z0-9]/g;

// Factory function to create fresh regex instances to avoid global state issues
export const createNutritionValueRegex = () => /\d+(?:\.\d+)?(?:kcal|fat|prot|carbs|sugar)/gi;
