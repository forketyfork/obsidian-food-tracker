import { App, Modal } from "obsidian";
import FoodTrackerPlugin from "./FoodTrackerPlugin";
import StatsService from "./StatsService";

export default class StatisticsModal extends Modal {
	private plugin: FoodTrackerPlugin;
	private statsService: StatsService;

	constructor(app: App, plugin: FoodTrackerPlugin) {
		super(app);
		this.plugin = plugin;
		this.statsService = new StatsService(app, plugin.nutritionTotal, plugin.settingsService, plugin.goalsService);
	}

	onOpen(): void {
		const { contentEl, titleEl } = this;
		contentEl.empty();
		titleEl.setText("Monthly nutrition statistics");

		const controlsContainer = contentEl.createDiv({ cls: "food-tracker-stats-controls" });
		const label = controlsContainer.createEl("label", {
			text: "Select month:",
			cls: "food-tracker-stats-label",
		});

		const now = new Date();
		const monthInput = controlsContainer.createEl("input", {
			type: "month",
			cls: "food-tracker-stats-month-input",
		});
		monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
		monthInput.id = "food-tracker-month-input";
		monthInput.setAttribute("aria-label", "Select month for statistics");
		label.setAttribute("for", "food-tracker-month-input");

		const tableContainer = contentEl.createDiv({ cls: "food-tracker-stats-table-container" });

		const render = async () => {
			tableContainer.empty();
			const [yearStr, monthStr] = monthInput.value.split("-");
			const year = Number(yearStr);
			const month = Number(monthStr);
			const stats = await this.statsService.getMonthlyStats(year, month);

			const hasAnyData = stats.some(s => s.element !== null);
			const errors = stats.filter(s => s.error).map(s => s.error as string);

			if (!hasAnyData) {
				tableContainer.createEl("div", {
					cls: "food-tracker-stats-empty",
					text: "No food tracking data found for this month.",
				});
				return;
			}

			const table = tableContainer.createEl("table", { cls: "food-tracker-stats-table" });
			for (const stat of stats) {
				const row = table.createEl("tr", { cls: "food-tracker-stats-row" });
				row.createEl("td", { text: stat.formattedDate, cls: "food-tracker-stats-date" });
				const cell = row.createEl("td", { cls: "food-tracker-stats-data" });
				if (stat.element) {
					cell.appendChild(stat.element);
				} else if (stat.error) {
					cell.createEl("span", {
						text: "Error loading",
						cls: "food-tracker-stats-error",
					});
				}
			}

			if (errors.length > 0) {
				const errorContainer = tableContainer.createDiv({ cls: "food-tracker-stats-errors" });
				errorContainer.createEl("p", { text: "Some data could not be loaded:" });
				const errorList = errorContainer.createEl("ul");
				errors.forEach(err => errorList.createEl("li", { text: err }));
			}
		};

		monthInput.addEventListener("change", () => {
			void render();
		});

		void render();
	}

	onClose() {
		this.contentEl.empty();
		this.statsService.unload();
	}
}
