import NutrientCache from "./NutrientCache";
import type { NutrientGoals } from "./GoalsService";
import { FOOD_TRACKER_ICON_NAME } from "./icon";
import { setIcon } from "obsidian";
import { calculateNutritionTotals, NutrientData, NutrientGoalProgress } from "./NutritionCalculator";

/**
 * Calculates total nutrition values from food entries in document content
 * Supports both linked format and inline nutrition format
 */
export default class NutritionTotal {
	private nutrientCache: NutrientCache;

	constructor(nutrientCache: NutrientCache) {
		this.nutrientCache = nutrientCache;
	}

	formatNutrientData(nutrients: NutrientData, goals?: NutrientGoals, showIcon: boolean = true): HTMLElement | null {
		if (!nutrients || Object.keys(nutrients).length === 0) {
			return null;
		}
		const goalProgress = goals ? this.calculateGoalProgress(nutrients, goals) : undefined;
		return this.formatTotal(nutrients, goals, undefined, undefined, undefined, undefined, showIcon, goalProgress);
	}

	private calculateGoalProgress(
		consumed: NutrientData,
		goals: NutrientGoals
	): Record<keyof Omit<NutrientData, "serving_size" | "nutrition_per">, NutrientGoalProgress> {
		const progress = {} as Record<keyof Omit<NutrientData, "serving_size" | "nutrition_per">, NutrientGoalProgress>;

		const nutrientKeys: Array<keyof Omit<NutrientData, "serving_size" | "nutrition_per">> = [
			"calories",
			"fats",
			"saturated_fats",
			"protein",
			"carbs",
			"fiber",
			"sugar",
			"sodium",
		];

		for (const key of nutrientKeys) {
			const goal = goals[key];
			const consumedValue = consumed[key] ?? 0;

			if (goal !== undefined) {
				const remaining = goal - consumedValue;
				const percentConsumed = goal > 0 ? Math.round((consumedValue / goal) * 100) : 0;
				const percentRemaining = goal > 0 ? Math.max(0, Math.round((remaining / goal) * 100)) : 0;

				progress[key] = {
					remaining,
					percentConsumed,
					percentRemaining,
				};
			}
		}

		return progress;
	}

	calculateTotalNutrients(
		content: string,
		foodTag: string = "food",
		escaped = false,
		goals?: NutrientGoals,
		workoutTag: string = "workout",
		workoutTagEscaped?: boolean,
		showIcon: boolean = true
	): HTMLElement | null {
		try {
			const result = calculateNutritionTotals({
				content,
				foodTag,
				escapedFoodTag: escaped,
				workoutTag,
				workoutTagEscaped,
				getNutritionData: (filename: string) => this.nutrientCache.getNutritionData(filename),
				goals,
			});

			if (!result) {
				return null;
			}

			return this.formatTotal(
				result.clampedTotals,
				goals,
				result.workoutTotals,
				foodTag,
				workoutTag,
				result.combinedTotals,
				showIcon,
				result.goalProgress
			);
		} catch (error) {
			console.error("Error calculating nutrition total:", error);
			return null;
		}
	}

	private formatTotal(
		nutrients: NutrientData,
		goals?: NutrientGoals,
		workoutTotals?: NutrientData,
		foodTag?: string,
		workoutTag?: string,
		unclampedNutrients?: NutrientData,
		showIcon: boolean = true,
		goalProgress?: Record<keyof Omit<NutrientData, "serving_size" | "nutrition_per">, NutrientGoalProgress>
	): HTMLElement | null {
		const formatConfig: {
			key: keyof Omit<NutrientData, "serving_size" | "nutrition_per">;
			emoji: string;
			name: string;
			unit: string;
			decimals: number;
		}[] = [
			{ key: "calories", emoji: "🔥", name: "Calories", unit: "kcal", decimals: 0 },
			{ key: "fats", emoji: "🥑", name: "Fats", unit: "g", decimals: 1 },
			{ key: "saturated_fats", emoji: "🧈", name: "Saturated fats", unit: "g", decimals: 1 },
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

				if (goals?.[config.key] !== undefined && goalProgress?.[config.key]) {
					const goal = goals[config.key] as number;
					const progress = goalProgress[config.key];
					const ratio = goal > 0 ? value / goal : 0;
					const percent = Math.min(100, Math.round(ratio * 100));

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
						const remaining = progress.remaining;
						const percentConsumed = progress.percentConsumed;
						const percentRemaining = progress.percentRemaining;

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
						goalTooltipText = `${config.name}: ${formattedValue} ${config.unit} (${progress.percentConsumed}% of ${goal} ${config.unit} goal)`;
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

		// Add the Food Tracker icon if showIcon is true
		if (showIcon) {
			const iconContainer = createEl("span", { cls: ["food-tracker-icon", "food-tracker-tooltip-host"] });
			iconContainer.setAttribute("data-food-tracker-tooltip", "Food tracker");
			iconContainer.setAttribute("aria-label", "Food tracker");
			setIcon(iconContainer, FOOD_TRACKER_ICON_NAME);
			container.appendChild(iconContainer);

			// Add separator after icon
			container.appendChild(createEl("div", { cls: "food-tracker-separator" }));
		}

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
