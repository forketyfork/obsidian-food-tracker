import { App, TFile, Component } from "obsidian";
import NutritionTotal from "./NutritionTotal";
import { SettingsService } from "./SettingsService";
import GoalsService from "./GoalsService";

export interface DailyStat {
	date: string;
	formattedDate: string;
	element: HTMLElement | null;
	error?: string;
}

/**
 * Provides aggregated nutrition statistics for daily notes.
 */
export default class StatsService extends Component {
	private app: App;
	private nutritionTotal: NutritionTotal;
	private settingsService: SettingsService;
	private goalsService: GoalsService;

	constructor(app: App, nutritionTotal: NutritionTotal, settingsService: SettingsService, goalsService: GoalsService) {
		super();
		this.app = app;
		this.nutritionTotal = nutritionTotal;
		this.settingsService = settingsService;
		this.goalsService = goalsService;
	}

	async getMonthlyStats(year: number, month: number): Promise<DailyStat[]> {
		const files = this.app.vault.getMarkdownFiles();
		const dateRegex = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/;
		const filesByDay = new Map<number, TFile>();

		for (const file of files) {
			const filename = file.basename ?? file.name ?? file.path;
			const match = dateRegex.exec(filename);
			if (match) {
				const fileYear = Number(match[1]);
				const fileMonth = Number(match[2]);
				const fileDay = Number(match[3]);

				if (fileMonth < 1 || fileMonth > 12 || fileDay < 1 || fileDay > 31) {
					continue;
				}

				if (fileYear === year && fileMonth === month) {
					filesByDay.set(fileDay, file);
				}
			}
		}

		const daysInMonth = new Date(year, month, 0).getDate();
		const stats: DailyStat[] = [];

		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(year, month - 1, day);
			const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			const formattedDate = date.toLocaleDateString(undefined, {
				weekday: "short",
				month: "short",
				day: "numeric",
			});

			const file = filesByDay.get(day);
			let element: HTMLElement | null = null;
			let error: string | undefined;

			if (file) {
				try {
					const content = await (this.app.vault.cachedRead
						? this.app.vault.cachedRead(file)
						: this.app.vault.read(file));
					element = this.nutritionTotal.calculateTotalNutrients(
						content,
						this.settingsService.currentEscapedFoodTag,
						true,
						this.goalsService.currentGoals
					);
				} catch (err) {
					console.error("Error calculating stats for", file.path, err);
					error = `Failed to load data for ${formattedDate}`;
				}
			}
			stats.push({ date: dateStr, formattedDate, element, error });
		}

		return stats;
	}
}
