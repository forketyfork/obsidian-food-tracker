import NutrientCache from "./NutrientCache";
import type { NutrientGoals } from "./GoalsService";
import { SPECIAL_CHARS_REGEX, createInlineNutritionRegex, createLinkedFoodRegex } from "./constants";
import { FOOD_TRACKER_ICON } from "./icon";

interface NutrientData {
	calories?: number;
	fats?: number;
	protein?: number;
	carbs?: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
}

interface FoodEntry {
	filename: string;
	amount: number;
	unit: string;
}

interface InlineNutrientEntry {
	calories?: number;
	fats?: number;
	protein?: number;
	carbs?: number;
	sugar?: number;
}

/**
 * Calculates total nutrition values from food entries in document content
 * Supports both linked format and inline nutrition format
 */
export default class NutritionTotal {
	private nutrientCache: NutrientCache;

	// Define mapping from nutrient units to property names
	private readonly nutrientKeyMap: Record<string, keyof InlineNutrientEntry> = {
		kcal: "calories",
		fat: "fats",
		prot: "protein",
		carbs: "carbs",
		sugar: "sugar",
	};

	constructor(nutrientCache: NutrientCache) {
		this.nutrientCache = nutrientCache;
	}

	calculateTotalNutrients(content: string, foodTag: string = "food", escaped = false, goals?: NutrientGoals): string {
		try {
			const tag = escaped ? foodTag : foodTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
			const foodEntries = this.parseFoodEntries(content, tag);
			const inlineEntries = this.parseInlineNutrientEntries(content, tag);

			if (foodEntries.length === 0 && inlineEntries.length === 0) {
				return "";
			}

			const totalNutrients = this.calculateTotals(foodEntries);
			const inlineTotals = this.calculateInlineTotals(inlineEntries);

			// Combine both totals
			const combined = this.combineNutrients(totalNutrients, inlineTotals);
			return this.formatTotal(combined, goals);
		} catch (error) {
			console.error("Error calculating nutrition total:", error);
			return "";
		}
	}

	private parseFoodEntries(content: string, escapedFoodTag: string): FoodEntry[] {
		const entries: FoodEntry[] = [];
		const lines = content.split("\n");
		const entryRegex = createLinkedFoodRegex(escapedFoodTag);

		for (const line of lines) {
			const match = entryRegex.exec(line);
			if (match) {
				const filename = match[1];
				const amount = parseFloat(match[2]);
				const unit = match[3].toLowerCase();

				entries.push({
					filename,
					amount,
					unit,
				});
			}
		}

		return entries;
	}

	private parseInlineNutrientEntries(content: string, escapedFoodTag: string): InlineNutrientEntry[] {
		const entries: InlineNutrientEntry[] = [];
		const lines = content.split("\n");
		const inlineRegex = createInlineNutritionRegex(escapedFoodTag);

		for (const line of lines) {
			const foodMatch = inlineRegex.exec(line);
			if (foodMatch) {
				const nutrientString = foodMatch[2];
				const nutrientData = this.parseNutrientString(nutrientString);
				if (Object.keys(nutrientData).length > 0) {
					entries.push(nutrientData);
				}
			}
		}

		return entries;
	}

	/**
	 * Parses inline nutrition strings like "300kcal 20fat 10prot 30carbs 3sugar"
	 * Uses a single regex with matchAll for better performance
	 */
	private parseNutrientString(nutrientString: string): InlineNutrientEntry {
		const nutrientData: InlineNutrientEntry = {};
		// This single regex finds all number-unit pairs
		const nutrientRegex = /(\d+(?:\.\d+)?)\s*(kcal|fat|prot|carbs|sugar)/gi;

		const matches = nutrientString.matchAll(nutrientRegex);

		for (const match of matches) {
			const value = parseFloat(match[1]);
			const unit = match[2].toLowerCase();
			const key = this.nutrientKeyMap[unit];
			if (key) {
				nutrientData[key] = (nutrientData[key] ?? 0) + value; // Sum if unit appears twice
			}
		}
		return nutrientData;
	}

	/**
	 * Helper method to add nutrients from source to target with optional multiplier
	 * Eliminates duplication in nutrient calculation methods
	 */
	private addNutrients(target: NutrientData, source: NutrientData, multiplier: number = 1): void {
		// Get all keys from the source object
		const keys = Object.keys(source) as Array<keyof NutrientData>;
		for (const key of keys) {
			// Ensure both target and source have the property before adding
			if (source[key] !== undefined) {
				target[key] = (target[key] ?? 0) + source[key] * multiplier;
			}
		}
	}

	private calculateInlineTotals(entries: InlineNutrientEntry[]): NutrientData {
		const totals: NutrientData = {}; // Start with an empty object
		for (const entry of entries) {
			this.addNutrients(totals, entry);
		}
		return totals;
	}

	private combineNutrients(nutrients1: NutrientData, nutrients2: NutrientData): NutrientData {
		const combined: NutrientData = { ...nutrients1 }; // Start with a copy of the first
		this.addNutrients(combined, nutrients2);
		return combined;
	}

	private calculateTotals(entries: FoodEntry[]): NutrientData {
		const totals: NutrientData = {}; // Start with an empty object
		for (const entry of entries) {
			const nutrients = this.getNutrientDataForFile(entry.filename);
			if (nutrients) {
				const multiplier = this.getMultiplier(entry.amount, entry.unit);
				this.addNutrients(totals, nutrients, multiplier);
			}
		}
		return totals;
	}

	private getNutrientDataForFile(filename: string): NutrientData | null {
		try {
			return this.nutrientCache.getNutritionData(filename);
		} catch (error) {
			console.error(
				`Error reading nutrient data for ${filename}:`,
				error instanceof Error ? error.message : String(error)
			);
			return null;
		}
	}

	/**
	 * Converts various units to a multiplier based on 100g servings
	 * Handles weight and volume conversions with reasonable approximations
	 * Volume units (cups, tbsp, tsp) are converted assuming water density (1ml ≈ 1g)
	 */
	private getMultiplier(amount: number, unit: string): number {
		// Assume nutrient data is per 100g by default
		const baseAmount = 100;

		switch (unit) {
			case "g":
				return amount / baseAmount;
			case "kg":
				return (amount * 1000) / baseAmount;
			case "ml":
				return amount / baseAmount; // Assume 1ml = 1g for simplicity
			case "l":
				return (amount * 1000) / baseAmount;
			case "oz":
				return (amount * 28.35) / baseAmount;
			case "lb":
				return (amount * 453.6) / baseAmount;
			case "cup":
			case "cups":
				return (amount * 240) / baseAmount; // 1 cup = 240ml ≈ 240g
			case "tbsp":
				return (amount * 15) / baseAmount; // 1 tablespoon = 15ml ≈ 15g
			case "tsp":
				return (amount * 5) / baseAmount; // 1 teaspoon = 5ml ≈ 5g
			default:
				return amount / baseAmount; // Default to grams
		}
	}

	private formatTotal(nutrients: NutrientData, goals?: NutrientGoals): string {
		const formatConfig: { key: keyof NutrientData; emoji: string; name: string; unit: string; decimals: number }[] = [
			{ key: "calories", emoji: "🔥", name: "Calories", unit: "kcal", decimals: 0 },
			{ key: "fats", emoji: "🥑", name: "Fats", unit: "g", decimals: 1 },
			{ key: "protein", emoji: "🥩", name: "Protein", unit: "g", decimals: 1 },
			{ key: "carbs", emoji: "🍞", name: "Carbs", unit: "g", decimals: 1 },
			{ key: "fiber", emoji: "🌾", name: "Fiber", unit: "g", decimals: 1 },
			{ key: "sugar", emoji: "🍯", name: "Sugar", unit: "g", decimals: 1 },
			{ key: "sodium", emoji: "🧂", name: "Sodium", unit: "mg", decimals: 1 },
		];

		const parts: string[] = [];
		for (const config of formatConfig) {
			const value = nutrients[config.key];
			if (value && value > 0) {
				const formattedValue = config.decimals === 0 ? Math.round(value) : value.toFixed(config.decimals);
				const tooltipText = `${config.name}: ${formattedValue} ${config.unit}`;

				if (goals?.[config.key] !== undefined) {
					const goal = goals[config.key] as number;
					const ratio = goal > 0 ? value / goal : 0;
					const percent = Math.min(100, Math.round(ratio * 100));

					// Green if within 10% of goal (0.9 to 1.1), red if over, yellow if under
					const colorClass =
						ratio >= 0.9 && ratio <= 1.1
							? "food-tracker-progress-green"
							: ratio > 1.1
								? "food-tracker-progress-red"
								: "food-tracker-progress-yellow";

					const goalTooltipText = `${config.name}: ${formattedValue} ${config.unit} (${percent}% of ${goal} ${config.unit} goal)`;
					parts.push(
						`<span class="food-tracker-progress food-tracker-nutrient-item food-tracker-tooltip-host ${colorClass}" style="--food-tracker-progress-percent:${percent}%" data-tooltip="${goalTooltipText}">${config.emoji}</span>`
					);
				} else {
					parts.push(
						`<span class="food-tracker-nutrient-item food-tracker-tooltip-host" data-tooltip="${tooltipText}">${config.emoji}</span>`
					);
				}
			}
		}

		if (parts.length === 0) return "";

		// Add the Food Tracker icon to the left of the nutrition bar
		return `<div class="food-tracker-nutrition-bar">${FOOD_TRACKER_ICON}<div class="food-tracker-separator"></div>${parts.join('<div class="food-tracker-separator"></div>')}</div>`;
	}
}
