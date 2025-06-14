import { makeAutoObservable } from "mobx";
import NutrientCache from "./NutrientCache";
import type { NutrientGoals } from "./GoalsService";
import { SPECIAL_CHARS_REGEX, createInlineNutritionRegex, createLinkedFoodRegex } from "./constants";

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
	fiber?: number;
	sodium?: number;
}

export class NutritionStore {
	private nutrientCache: NutrientCache;
	private readonly nutrientKeyMap: Record<string, keyof InlineNutrientEntry> = {
		kcal: "calories",
		fat: "fats",
		prot: "protein",
		carbs: "carbs",
		sugar: "sugar",
		fiber: "fiber",
		sodium: "sodium",
	};

	totalNutrients: NutrientData = {};
	goals?: NutrientGoals;
	isLoading = false;
	error: string | null = null;

	constructor(nutrientCache: NutrientCache) {
		makeAutoObservable(this);
		this.nutrientCache = nutrientCache;
	}

	setGoals(goals?: NutrientGoals) {
		this.goals = goals;
	}

	calculateTotalNutrients(content: string, foodTag: string = "food", escaped = false) {
		try {
			this.isLoading = true;
			this.error = null;

			const tag = escaped ? foodTag : foodTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
			const foodEntries = this.parseFoodEntries(content, tag);
			const inlineEntries = this.parseInlineNutrientEntries(content, tag);

			if (foodEntries.length === 0 && inlineEntries.length === 0) {
				this.totalNutrients = {};
				return;
			}

			const totalNutrients = this.calculateTotals(foodEntries);
			const inlineTotals = this.calculateInlineTotals(inlineEntries);

			this.totalNutrients = this.combineNutrients(totalNutrients, inlineTotals);
		} catch (error) {
			this.error = error instanceof Error ? error.message : "Unknown error occurred";
			console.error("Error calculating nutrition total:", error);
		} finally {
			this.isLoading = false;
		}
	}

	get hasNutrients() {
		return Object.values(this.totalNutrients).some(value => value && value > 0);
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

	private parseNutrientString(nutrientString: string): InlineNutrientEntry {
		const nutrientData: InlineNutrientEntry = {};
		const nutrientRegex = /(\d+(?:\.\d+)?)\s*(kcal|fat|prot|carbs|sugar|fiber|sodium)/gi;

		const matches = nutrientString.matchAll(nutrientRegex);

		for (const match of matches) {
			const value = parseFloat(match[1]);
			const unit = match[2].toLowerCase();
			const key = this.nutrientKeyMap[unit];
			if (key) {
				nutrientData[key] = (nutrientData[key] ?? 0) + value;
			}
		}
		return nutrientData;
	}

	private addNutrients(target: NutrientData, source: NutrientData, multiplier: number = 1): void {
		const keys = Object.keys(source) as Array<keyof NutrientData>;
		for (const key of keys) {
			if (source[key] !== undefined) {
				target[key] = (target[key] ?? 0) + source[key] * multiplier;
			}
		}
	}

	private calculateInlineTotals(entries: InlineNutrientEntry[]): NutrientData {
		const totals: NutrientData = {};
		for (const entry of entries) {
			this.addNutrients(totals, entry);
		}
		return totals;
	}

	private combineNutrients(nutrients1: NutrientData, nutrients2: NutrientData): NutrientData {
		const combined: NutrientData = { ...nutrients1 };
		this.addNutrients(combined, nutrients2);
		return combined;
	}

	private calculateTotals(entries: FoodEntry[]): NutrientData {
		const totals: NutrientData = {};
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

	private getMultiplier(amount: number, unit: string): number {
		const baseAmount = 100;

		switch (unit) {
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
			default:
				return amount / baseAmount;
		}
	}
}
