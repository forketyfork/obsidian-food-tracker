import { App, TFile } from "obsidian";
import NutritionTotal from "./NutritionTotal";
import { SettingsService } from "./SettingsService";
import GoalsService from "./GoalsService";
import DailyNoteLocator from "./DailyNoteLocator";

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
	private dailyNoteLocator: DailyNoteLocator;

	constructor(app: App, nutritionTotal: NutritionTotal, settingsService: SettingsService, goalsService: GoalsService) {
		this.app = app;
		this.nutritionTotal = nutritionTotal;
		this.settingsService = settingsService;
		this.goalsService = goalsService;
		this.dailyNoteLocator = new DailyNoteLocator(settingsService);
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
				const contents: string[] = [];
				for (const file of matchingFiles) {
					try {
						const content = await this.readVaultFile(file);
						contents.push(content);
					} catch (error) {
						console.error(`Error reading ${file.path} while calculating nutrition stats for ${dateStr}:`, error);
					}
				}

				if (contents.length > 0) {
					element = this.nutritionTotal.calculateTotalNutrients(
						contents.join("\n"),
						this.settingsService.currentEscapedFoodTag,
						true,
						this.goalsService.currentGoals,
						this.settingsService.currentEscapedWorkoutTag,
						true,
						false
					);
				}
			}

			return { date: dateStr, element };
		});

		return Promise.all(statsPromises);
	}

	private async readVaultFile(file: TFile): Promise<string> {
		if (typeof this.app.vault.cachedRead === "function") {
			return this.app.vault.cachedRead(file);
		}
		return this.app.vault.read(file);
	}
}
