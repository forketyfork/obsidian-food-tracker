import { App, TFile } from "obsidian";
import NutritionTotal from "./NutritionTotal";
import { SettingsService } from "./SettingsService";
import GoalsService from "./GoalsService";
import DailyNoteLocator from "./DailyNoteLocator";
import {
	extractFrontmatterTotals,
	FRONTMATTER_KEYS,
	FrontmatterTotals,
	nutrientDataToFrontmatterTotals,
} from "./FrontmatterTotalsService";
import { NutrientData, calculateNutritionTotals } from "./NutritionCalculator";
import NutrientCache from "./NutrientCache";

export interface DailyStat {
	date: string;
	element: HTMLElement | null;
}

function frontmatterTotalsToNutrientData(totals: FrontmatterTotals): NutrientData {
	const data: NutrientData = {};
	if (totals.calories !== undefined) data.calories = totals.calories;
	if (totals.fats !== undefined) data.fats = totals.fats;
	if (totals.saturated_fats !== undefined) data.saturated_fats = totals.saturated_fats;
	if (totals.protein !== undefined) data.protein = totals.protein;
	if (totals.carbs !== undefined) data.carbs = totals.carbs;
	if (totals.fiber !== undefined) data.fiber = totals.fiber;
	if (totals.sugar !== undefined) data.sugar = totals.sugar;
	if (totals.sodium !== undefined) data.sodium = totals.sodium;
	return data;
}

/**
 * Provides aggregated nutrition statistics for daily notes.
 */
export default class StatsService {
	private app: App;
	private nutritionTotal: NutritionTotal;
	private settingsService: SettingsService;
	private goalsService: GoalsService;
	private dailyNoteLocator: DailyNoteLocator;
	private nutrientCache: NutrientCache;

	constructor(
		app: App,
		nutritionTotal: NutritionTotal,
		settingsService: SettingsService,
		goalsService: GoalsService,
		nutrientCache: NutrientCache
	) {
		this.app = app;
		this.nutritionTotal = nutritionTotal;
		this.settingsService = settingsService;
		this.goalsService = goalsService;
		this.dailyNoteLocator = new DailyNoteLocator(settingsService);
		this.nutrientCache = nutrientCache;
	}

	async getMonthlyStats(year: number, month: number): Promise<DailyStat[]> {
		const files = this.app.vault.getMarkdownFiles();
		const filesByDay = new Map<string, TFile[]>();

		for (const file of files) {
			const match = this.dailyNoteLocator.match(file);
			if (!match) continue;

			const fileDate = match.date;
			if (fileDate.getFullYear() !== year || fileDate.getMonth() + 1 !== month) {
				continue;
			}

			const existing = filesByDay.get(match.key) ?? [];
			existing.push(file);
			filesByDay.set(match.key, existing);
		}

		const daysInMonth = new Date(year, month, 0).getDate();

		const statsPromises = Array.from({ length: daysInMonth }, async (_, index) => {
			const day = index + 1;
			const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			const matchingFiles = filesByDay.get(dateStr);
			let element: HTMLElement | null = null;

			if (matchingFiles?.length) {
				const { totals, filesToBackfill } = this.aggregateFrontmatterTotals(matchingFiles);

				if (filesToBackfill.length > 0) {
					const backfilledTotals = await this.backfillFiles(filesToBackfill);
					for (const key of Object.keys(FRONTMATTER_KEYS) as Array<keyof FrontmatterTotals>) {
						if (backfilledTotals[key] !== undefined) {
							totals[key] = (totals[key] ?? 0) + backfilledTotals[key];
						}
					}
				}

				if (Object.keys(totals).length > 0) {
					const nutrientData = frontmatterTotalsToNutrientData(totals);
					element = this.nutritionTotal.formatNutrientData(nutrientData, this.goalsService.currentGoals, false);
				}
			}

			return { date: dateStr, element };
		});

		return Promise.all(statsPromises);
	}

	private aggregateFrontmatterTotals(files: TFile[]): {
		totals: FrontmatterTotals;
		filesToBackfill: TFile[];
	} {
		const aggregated: FrontmatterTotals = {};
		const filesToBackfill: TFile[] = [];

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const totals = cache?.frontmatter ? extractFrontmatterTotals(cache.frontmatter) : null;

			if (!totals) {
				filesToBackfill.push(file);
				continue;
			}

			for (const key of Object.keys(FRONTMATTER_KEYS) as Array<keyof FrontmatterTotals>) {
				if (totals[key] !== undefined) {
					aggregated[key] = (aggregated[key] ?? 0) + totals[key];
				}
			}
		}

		return { totals: aggregated, filesToBackfill };
	}

	private async backfillFiles(files: TFile[]): Promise<FrontmatterTotals> {
		const aggregated: FrontmatterTotals = {};

		for (const file of files) {
			try {
				const content = await this.app.vault.cachedRead(file);
				const result = calculateNutritionTotals({
					content,
					foodTag: this.settingsService.currentEscapedFoodTag,
					escapedFoodTag: true,
					workoutTag: this.settingsService.currentEscapedWorkoutTag,
					workoutTagEscaped: true,
					getNutritionData: (filename: string) => this.nutrientCache.getNutritionData(filename),
					goals: this.goalsService.currentGoals,
				});

				if (result?.clampedTotals) {
					const totals = nutrientDataToFrontmatterTotals(result.clampedTotals);

					for (const key of Object.keys(FRONTMATTER_KEYS) as Array<keyof FrontmatterTotals>) {
						if (totals[key] !== undefined) {
							aggregated[key] = (aggregated[key] ?? 0) + totals[key];
						}
					}

					void this.writeFrontmatterTotals(file, result.clampedTotals);
				}
			} catch (error) {
				console.error(`Error backfilling ${file.path}:`, error);
			}
		}

		return aggregated;
	}

	private async writeFrontmatterTotals(file: TFile, totals: NutrientData): Promise<void> {
		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
				const formattedTotals = nutrientDataToFrontmatterTotals(totals);

				for (const [key, frontmatterKey] of Object.entries(FRONTMATTER_KEYS)) {
					const value = formattedTotals[key as keyof FrontmatterTotals];
					if (value !== undefined && (value > 0 || key === "calories")) {
						frontmatter[frontmatterKey] = value;
					} else {
						delete frontmatter[frontmatterKey];
					}
				}
			});
		} catch (error) {
			console.error(`Error writing frontmatter totals for ${file.path}:`, error);
		}
	}
}
