import { App, TFile } from "obsidian";
import NutritionTotal from "./NutritionTotal";
import { SettingsService } from "./SettingsService";
import GoalsService from "./GoalsService";

export interface DailyStat {
	date: string;
	element: HTMLElement | null;
}

/**
 * Provides aggregated nutrition statistics for daily notes.
 */
export default class StatsService {
	private app: App;
	private nutritionTotal: NutritionTotal;
	private settingsService: SettingsService;
	private goalsService: GoalsService;

	constructor(app: App, nutritionTotal: NutritionTotal, settingsService: SettingsService, goalsService: GoalsService) {
		this.app = app;
		this.nutritionTotal = nutritionTotal;
		this.settingsService = settingsService;
		this.goalsService = goalsService;
	}

	async getMonthlyStats(year: number, month: number): Promise<DailyStat[]> {
		const files = this.app.vault.getMarkdownFiles();
		const dateRegex = /^(\d{4})-(\d{2})-(\d{2})/;
		const filesByDay = new Map<number, TFile>();

		for (const file of files) {
			const filename = file.basename ?? file.name ?? file.path;
			const match = dateRegex.exec(filename);
			if (match) {
				const fileYear = Number(match[1]);
				const fileMonth = Number(match[2]);
				const fileDay = Number(match[3]);
				if (fileYear === year && fileMonth === month) {
					filesByDay.set(fileDay, file);
				}
			}
		}

		const daysInMonth = new Date(year, month, 0).getDate();

		const statsPromises = Array.from({ length: daysInMonth }, async (_, index) => {
			const day = index + 1;
			const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			const file = filesByDay.get(day);
			let element: HTMLElement | null = null;

			if (file) {
				try {
					const content = await (this.app.vault.cachedRead?.(file) ?? this.app.vault.read(file));
					element = this.nutritionTotal.calculateTotalNutrients(
						content,
						this.settingsService.currentEscapedFoodTag,
						true,
						this.goalsService.currentGoals,
						this.settingsService.currentEscapedWorkoutTag,
						true,
						false
					);
				} catch (error) {
					console.error(`Error calculating nutrition stats for ${file.path} on ${dateStr}:`, error);
				}
			}

			return { date: dateStr, element };
		});

		const stats = await Promise.all(statsPromises);
		return stats;
	}
}
