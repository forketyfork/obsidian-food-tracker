import NutrientCache from "./NutrientCache";
import type { NutrientGoals } from "./GoalsService";
import { SPECIAL_CHARS_REGEX, createInlineNutritionRegex, createLinkedFoodRegex, getUnitMultiplier } from "./constants";
import { FOOD_TRACKER_ICON_NAME } from "./icon";
import { setIcon } from "obsidian";

interface NutrientData {
	calories?: number;
	fats?: number;
	protein?: number;
	carbs?: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
	serving_size?: number;
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
		fiber: "fiber",
		sodium: "sodium",
	};

	constructor(nutrientCache: NutrientCache) {
		this.nutrientCache = nutrientCache;
	}

	calculateTotalNutrients(
		content: string,
		foodTag: string = "food",
		escaped = false,
		goals?: NutrientGoals,
		workoutTag: string = "workout",
		workoutTagEscaped?: boolean
	): HTMLElement | null {
		try {
			const tag = escaped ? foodTag : foodTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
			const hasWorkoutTag = workoutTag.trim().length > 0;
			const workoutEscaped = workoutTagEscaped ?? escaped;
			const normalizedWorkoutTag = hasWorkoutTag
				? workoutEscaped
					? workoutTag
					: workoutTag.replace(SPECIAL_CHARS_REGEX, "\\$&")
				: null;
			const foodEntries = this.parseFoodEntries(content, tag);
			const inlineEntries = this.parseInlineNutrientEntries(content, tag);
			const workoutEntries = normalizedWorkoutTag ? this.parseInlineNutrientEntries(content, normalizedWorkoutTag) : [];

			if (foodEntries.length === 0 && inlineEntries.length === 0 && workoutEntries.length === 0) {
				return null;
			}

			const totalNutrients = this.calculateTotals(foodEntries);
			const inlineTotals = this.calculateInlineTotals(inlineEntries);

			let workoutTotals: NutrientData = {};
			if (workoutEntries.length > 0) {
				const validWorkoutEntries = this.filterValidWorkoutEntries(workoutEntries);
				if (validWorkoutEntries.length > 0) {
					workoutTotals = this.calculateInlineTotals(validWorkoutEntries);
					if (Object.keys(workoutTotals).length > 0) {
						this.addNutrients(inlineTotals, workoutTotals, -1);
					}
				}
			}

			// Combine both totals
			const combined = this.combineNutrients(totalNutrients, inlineTotals);
			const clamped = this.clampNutrientsToZero(combined);
			return this.formatTotal(clamped, goals, workoutTotals, foodTag, workoutTag, combined);
		} catch (error) {
			console.error("Error calculating nutrition total:", error);
			return null;
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
		const nutrientRegex = /(-?\d+(?:\.\d+)?)\s*(kcal|fat|prot|carbs|sugar|fiber|sodium)/gi;

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

	private filterValidWorkoutEntries(entries: InlineNutrientEntry[]): InlineNutrientEntry[] {
		return entries.filter(entry => {
			const hasPositiveValues = Object.values(entry).some(value => value !== undefined && value > 0);
			const hasNoNegativeCalories = entry.calories === undefined || entry.calories >= 0;
			return hasPositiveValues && hasNoNegativeCalories;
		});
	}

	private combineNutrients(nutrients1: NutrientData, nutrients2: NutrientData): NutrientData {
		const combined: NutrientData = { ...nutrients1 };
		this.addNutrients(combined, nutrients2);
		return combined;
	}

	private clampNutrientsToZero(nutrients: NutrientData): NutrientData {
		const clamped: NutrientData = {};
		const keys = Object.keys(nutrients) as Array<keyof NutrientData>;
		for (const key of keys) {
			const value = nutrients[key];
			if (value !== undefined) {
				clamped[key] = Math.max(0, value);
			}
		}
		return clamped;
	}

	private calculateTotals(entries: FoodEntry[]): NutrientData {
		const totals: NutrientData = {};
		for (const entry of entries) {
			const nutrients = this.getNutrientDataForFile(entry.filename);
			if (nutrients) {
				const multiplier = getUnitMultiplier(entry.amount, entry.unit, nutrients.serving_size);
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

	private formatTotal(
		nutrients: NutrientData,
		goals?: NutrientGoals,
		workoutTotals?: NutrientData,
		foodTag?: string,
		workoutTag?: string,
		unclampedNutrients?: NutrientData
	): HTMLElement | null {
		const formatConfig: {
			key: keyof Omit<NutrientData, "serving_size">;
			emoji: string;
			name: string;
			unit: string;
			decimals: number;
		}[] = [
			{ key: "calories", emoji: "🔥", name: "Calories", unit: "kcal", decimals: 0 },
			{ key: "fats", emoji: "🥑", name: "Fats", unit: "g", decimals: 1 },
			{ key: "protein", emoji: "🥩", name: "Protein", unit: "g", decimals: 1 },
			{ key: "carbs", emoji: "🍞", name: "Carbs", unit: "g", decimals: 1 },
			{ key: "fiber", emoji: "🌾", name: "Fiber", unit: "g", decimals: 1 },
			{ key: "sugar", emoji: "🍯", name: "Sugar", unit: "g", decimals: 1 },
			{ key: "sodium", emoji: "🧂", name: "Sodium", unit: "mg", decimals: 1 },
		];

		const elements: HTMLElement[] = [];
		for (const config of formatConfig) {
			const value = nutrients[config.key];
			const shouldShow = value !== undefined && (value > 0 || (config.key === "calories" && value === 0));
			if (shouldShow) {
				const formattedValue = config.decimals === 0 ? Math.round(value) : value.toFixed(config.decimals);
				const tooltipText = `${config.name}: ${formattedValue} ${config.unit}`;

				const span = createEl("span", {
					cls: ["food-tracker-nutrient-item", "food-tracker-tooltip-host"],
					text: config.emoji,
				});
				span.setAttribute("data-food-tracker-tooltip", tooltipText);

				if (goals?.[config.key] !== undefined) {
					const goal = goals[config.key] as number;
					const ratio = goal > 0 ? value / goal : 0;
					const percent = Math.min(100, Math.round(ratio * 100));
					const actualPercent = Math.round(ratio * 100);

					// Green if within 10% of goal (0.9 to 1.1), red if over, yellow if under
					const colorClass =
						ratio >= 0.9 && ratio <= 1.1
							? "food-tracker-progress-green"
							: ratio > 1.1
								? "food-tracker-progress-red"
								: "food-tracker-progress-yellow";

					let goalTooltipText: string;
					if (config.key === "calories" && goal !== undefined && unclampedNutrients?.calories !== undefined) {
						const workoutCalories = workoutTotals?.calories ?? 0;
						const foodCalories = unclampedNutrients.calories + workoutCalories;
						const consumed = value;
						const remaining = Math.max(0, goal - consumed);
						const percentConsumed = actualPercent;
						const percentRemaining = Math.round((remaining / goal) * 100);

						const foodStr = `${Math.round(foodCalories)}`;
						const workoutStr = `${Math.round(workoutCalories)}`;
						const consumedStr = `${Math.round(consumed)}`;
						const goalStr = `${Math.round(goal)}`;
						const remainingStr = `${Math.round(remaining)}`;

						const maxNumWidth = Math.max(
							foodStr.length,
							workoutStr.length,
							consumedStr.length,
							goalStr.length,
							remainingStr.length
						);

						const displayFoodTag = foodTag ? `(#${foodTag})` : "(#food)";
						const displayWorkoutTag = workoutTag ? `(#${workoutTag})` : "(#workout)";

						goalTooltipText = [
							`   ${foodStr.padStart(maxNumWidth)} ${config.unit} ${displayFoodTag}`,
							`-  ${workoutStr.padStart(maxNumWidth)} ${config.unit} ${displayWorkoutTag}`,
							`   ${"".padStart(maxNumWidth, "-")}`,
							`   ${consumedStr.padStart(maxNumWidth)} ${config.unit} (${percentConsumed}% consumed)`,
							` `,
							` `,
							`   ${goalStr.padStart(maxNumWidth)} ${config.unit} (goal)`,
							`-  ${consumedStr.padStart(maxNumWidth)} ${config.unit} (consumed)`,
							`   ${"".padStart(maxNumWidth, "-")}`,
							`   ${remainingStr.padStart(maxNumWidth)} ${config.unit} (${percentRemaining}% remaining)`,
						].join("\n");
						span.addClass("food-tracker-tooltip-multiline");
					} else {
						goalTooltipText = `${config.name}: ${formattedValue} ${config.unit} (${actualPercent}% of ${goal} ${config.unit} goal)`;
					}

					span.addClass("food-tracker-progress", colorClass);
					span.style.setProperty("--food-tracker-progress-percent", `${percent}%`);
					span.setAttribute("data-food-tracker-tooltip", goalTooltipText);
				}

				elements.push(span);
			}
		}

		if (elements.length === 0) return null;

		// Create the main nutrition bar container
		const container = createEl("div", { cls: "food-tracker-nutrition-bar" });

		// Add the Food Tracker icon using Obsidian's registered icon
		const iconContainer = createEl("span", { cls: ["food-tracker-icon", "food-tracker-tooltip-host"] });
		iconContainer.setAttribute("data-food-tracker-tooltip", "Food tracker");
		iconContainer.setAttribute("aria-label", "Food tracker");
		setIcon(iconContainer, FOOD_TRACKER_ICON_NAME);
		container.appendChild(iconContainer);

		// Add separator after icon
		container.appendChild(createEl("div", { cls: "food-tracker-separator" }));

		// Add nutrient elements with separators between them
		elements.forEach((element, index) => {
			container.appendChild(element);
			if (index < elements.length - 1) {
				container.appendChild(createEl("div", { cls: "food-tracker-separator" }));
			}
		});

		return container;
	}
}
