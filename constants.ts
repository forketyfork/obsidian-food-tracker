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
