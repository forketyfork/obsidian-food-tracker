import NutrientCache from "./NutrientCache";

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

export default class NutritionTotal {
	private nutrientCache: NutrientCache;

	constructor(nutrientCache: NutrientCache) {
		this.nutrientCache = nutrientCache;
	}

	calculateTotalNutrients(content: string): string {
		try {
			const foodEntries = this.parseFoodEntries(content);
			const inlineEntries = this.parseInlineNutrientEntries(content);

			if (foodEntries.length === 0 && inlineEntries.length === 0) {
				return "";
			}

			const totalNutrients = this.calculateTotals(foodEntries);
			const inlineTotals = this.calculateInlineTotals(inlineEntries);

			// Combine both totals
			const combined = this.combineNutrients(totalNutrients, inlineTotals);
			return this.formatTotal(combined);
		} catch (error) {
			console.error("Error calculating nutrition total:", error);
			return "";
		}
	}

	private parseFoodEntries(content: string): FoodEntry[] {
		const entries: FoodEntry[] = [];
		const lines = content.split("\n");

		for (const line of lines) {
			// Match #food [[filename]] amount
			const match = line.match(/#food\s+\[\[([^\]]+)\]\]\s+(\d+(?:\.\d+)?)(kg|lb|cups?|tbsp|tsp|ml|oz|g|l)/i);
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

	private parseInlineNutrientEntries(content: string): InlineNutrientEntry[] {
		const entries: InlineNutrientEntry[] = [];
		const lines = content.split("\n");

		for (const line of lines) {
			// Match #food foodname followed by inline nutrients: 300kcal 20fat 10prot 30carbs 3sugar
			const foodMatch = line.match(
				/#food\s+(?!\[\[)([^\s]+(?:\s+[^\s]+)*?)\s+(\d+(?:\.\d+)?(?:kcal|fat|prot|carbs|sugar)(?:\s+\d+(?:\.\d+)?(?:kcal|fat|prot|carbs|sugar))*)/i
			);
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

	private parseNutrientString(nutrientString: string): InlineNutrientEntry {
		const nutrientData: InlineNutrientEntry = {};

		// Match patterns like: 300kcal, 20fat, 10prot, 30carbs, 3sugar
		const caloriesMatch = nutrientString.match(/(\d+(?:\.\d+)?)kcal/i);
		if (caloriesMatch) {
			nutrientData.calories = parseFloat(caloriesMatch[1]);
		}

		const fatsMatch = nutrientString.match(/(\d+(?:\.\d+)?)fat/i);
		if (fatsMatch) {
			nutrientData.fats = parseFloat(fatsMatch[1]);
		}

		const proteinMatch = nutrientString.match(/(\d+(?:\.\d+)?)prot/i);
		if (proteinMatch) {
			nutrientData.protein = parseFloat(proteinMatch[1]);
		}

		const carbsMatch = nutrientString.match(/(\d+(?:\.\d+)?)carbs/i);
		if (carbsMatch) {
			nutrientData.carbs = parseFloat(carbsMatch[1]);
		}

		const sugarMatch = nutrientString.match(/(\d+(?:\.\d+)?)sugar/i);
		if (sugarMatch) {
			nutrientData.sugar = parseFloat(sugarMatch[1]);
		}

		return nutrientData;
	}

	private calculateInlineTotals(entries: InlineNutrientEntry[]): NutrientData {
		const totals: NutrientData = {
			calories: 0,
			fats: 0,
			protein: 0,
			carbs: 0,
			fiber: 0,
			sugar: 0,
			sodium: 0,
		};

		for (const entry of entries) {
			totals.calories = (totals.calories ?? 0) + (entry.calories ?? 0);
			totals.fats = (totals.fats ?? 0) + (entry.fats ?? 0);
			totals.protein = (totals.protein ?? 0) + (entry.protein ?? 0);
			totals.carbs = (totals.carbs ?? 0) + (entry.carbs ?? 0);
			totals.sugar = (totals.sugar ?? 0) + (entry.sugar ?? 0);
		}

		return totals;
	}

	private combineNutrients(nutrients1: NutrientData, nutrients2: NutrientData): NutrientData {
		return {
			calories: (nutrients1.calories ?? 0) + (nutrients2.calories ?? 0),
			fats: (nutrients1.fats ?? 0) + (nutrients2.fats ?? 0),
			protein: (nutrients1.protein ?? 0) + (nutrients2.protein ?? 0),
			carbs: (nutrients1.carbs ?? 0) + (nutrients2.carbs ?? 0),
			fiber: (nutrients1.fiber ?? 0) + (nutrients2.fiber ?? 0),
			sugar: (nutrients1.sugar ?? 0) + (nutrients2.sugar ?? 0),
			sodium: (nutrients1.sodium ?? 0) + (nutrients2.sodium ?? 0),
		};
	}

	private calculateTotals(entries: FoodEntry[]): NutrientData {
		const totals: NutrientData = {
			calories: 0,
			fats: 0,
			protein: 0,
			carbs: 0,
			fiber: 0,
			sugar: 0,
			sodium: 0,
		};

		for (const entry of entries) {
			const nutrients = this.getNutrientDataForFile(entry.filename);
			if (nutrients) {
				const multiplier = this.getMultiplier(entry.amount, entry.unit);

				totals.calories = (totals.calories ?? 0) + (nutrients.calories ?? 0) * multiplier;
				totals.fats = (totals.fats ?? 0) + (nutrients.fats ?? 0) * multiplier;
				totals.protein = (totals.protein ?? 0) + (nutrients.protein ?? 0) * multiplier;
				totals.carbs = (totals.carbs ?? 0) + (nutrients.carbs ?? 0) * multiplier;
				totals.fiber = (totals.fiber ?? 0) + (nutrients.fiber ?? 0) * multiplier;
				totals.sugar = (totals.sugar ?? 0) + (nutrients.sugar ?? 0) * multiplier;
				totals.sodium = (totals.sodium ?? 0) + (nutrients.sodium ?? 0) * multiplier;
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
			default:
				return amount / baseAmount; // Default to grams
		}
	}

	private formatTotal(nutrients: NutrientData): string {
		const parts: string[] = [];

		if ((nutrients.calories ?? 0) > 0) {
			parts.push(`🔥 ${Math.round(nutrients.calories!)} kcal`);
		}

		if ((nutrients.fats ?? 0) > 0) {
			parts.push(`🥑 Fats: ${nutrients.fats!.toFixed(1)}g`);
		}

		if ((nutrients.protein ?? 0) > 0) {
			parts.push(`🥩 Protein: ${nutrients.protein!.toFixed(1)}g`);
		}

		if ((nutrients.carbs ?? 0) > 0) {
			parts.push(`🍞 Carbs: ${nutrients.carbs!.toFixed(1)}g`);
		}

		if ((nutrients.fiber ?? 0) > 0) {
			parts.push(`🌾 Fiber: ${nutrients.fiber!.toFixed(1)}g`);
		}

		if ((nutrients.sugar ?? 0) > 0) {
			parts.push(`🍯 Sugar: ${nutrients.sugar!.toFixed(1)}g`);
		}

		if ((nutrients.sodium ?? 0) > 0) {
			parts.push(`🧂 Sodium: ${nutrients.sodium!.toFixed(1)}mg`);
		}

		if (parts.length === 0) {
			return "";
		}

		return `📊 Daily total: ${parts.join(", ")}`;
	}
}
