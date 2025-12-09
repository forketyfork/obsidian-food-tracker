import { App, TFile } from "obsidian";
import NutritionTotal from "./NutritionTotal";
import { SettingsService } from "./SettingsService";
import GoalsService from "./GoalsService";
import DailyNoteLocator from "./DailyNoteLocator";
import { extractFrontmatterTotals, FRONTMATTER_KEYS, FrontmatterTotals } from "./FrontmatterTotalsService";
import { NutrientData } from "./NutritionCalculator";

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

	constructor(app: App, nutritionTotal: NutritionTotal, settingsService: SettingsService, goalsService: GoalsService) {
		this.app = app;
		this.nutritionTotal = nutritionTotal;
		this.settingsService = settingsService;
		this.goalsService = goalsService;
		this.dailyNoteLocator = new DailyNoteLocator(settingsService);
	}

	getMonthlyStats(year: number, month: number): DailyStat[] {
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

		return Array.from({ length: daysInMonth }, (_, index) => {
			const day = index + 1;
			const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			const matchingFiles = filesByDay.get(dateStr);
			let element: HTMLElement | null = null;

			if (matchingFiles?.length) {
				const aggregatedTotals = this.aggregateFrontmatterTotals(matchingFiles);

				if (aggregatedTotals) {
					const nutrientData = frontmatterTotalsToNutrientData(aggregatedTotals);
					element = this.nutritionTotal.formatNutrientData(nutrientData, this.goalsService.currentGoals, false);
				}
			}

			return { date: dateStr, element };
		});
	}

	private aggregateFrontmatterTotals(files: TFile[]): FrontmatterTotals | null {
		const aggregated: FrontmatterTotals = {};
		let hasAnyData = false;

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const totals = extractFrontmatterTotals(cache.frontmatter);
			if (!totals) continue;

			hasAnyData = true;
			for (const key of Object.keys(FRONTMATTER_KEYS) as Array<keyof FrontmatterTotals>) {
				if (totals[key] !== undefined) {
					aggregated[key] = (aggregated[key] ?? 0) + totals[key];
				}
			}
		}

		return hasAnyData ? aggregated : null;
	}
}
