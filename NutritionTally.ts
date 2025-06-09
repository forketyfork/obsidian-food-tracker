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

export default class NutritionTally {
	private nutrientCache: NutrientCache;

	constructor(nutrientCache: NutrientCache) {
		this.nutrientCache = nutrientCache;
	}

	calculateTotalNutrients(content: string): string {
		try {
			const foodEntries = this.parseFoodEntries(content);

			if (foodEntries.length === 0) {
				return "";
			}

			const totalNutrients = this.calculateTotals(foodEntries);
			return this.formatTally(totalNutrients);
		} catch (error) {
			console.error("Error calculating nutrition tally:", error);
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

	private formatTally(nutrients: NutrientData): string {
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

		return `📊 Daily tally: ${parts.join(", ")}`;
	}
}
