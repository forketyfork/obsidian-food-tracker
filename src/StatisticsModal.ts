import { App, Modal } from "obsidian";
import StatsService from "./StatsService";

export default class StatisticsModal extends Modal {
	private statsService: StatsService;
	private monthInput: HTMLInputElement | null = null;
	private changeHandler: (() => void) | null = null;

	constructor(app: App, statsService: StatsService) {
		super(app);
		this.statsService = statsService;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		this.titleEl.setText("Nutrition statistics");

		const now = new Date();
		this.monthInput = contentEl.createEl("input", { type: "month" });
		this.monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

		const oldestYear = 2020;
		this.monthInput.min = `${oldestYear}-01`;
		this.monthInput.max = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

		const tableContainer = contentEl.createDiv();

		const render = () => {
			tableContainer.empty();

			try {
				const [yearStr, monthStr] = this.monthInput!.value.split("-");
				const year = Number(yearStr);
				const month = Number(monthStr);
				const stats = this.statsService.getMonthlyStats(year, month);

				const table = tableContainer.createEl("table", { cls: "food-tracker-stats-table" });
				for (const stat of stats) {
					const row = table.createEl("tr", { cls: "food-tracker-stats-row" });
					row.createEl("td", {
						text: stat.date,
						cls: "food-tracker-stats-date",
					});
					const cell = row.createEl("td", { cls: "food-tracker-stats-nutrients" });
					if (stat.element) {
						cell.appendChild(stat.element);
					} else {
						cell.createDiv({
							text: "No data",
							cls: "food-tracker-stats-empty",
						});
					}
				}
			} catch (error) {
				tableContainer.empty();
				tableContainer.createDiv({
					cls: "food-tracker-error",
					text: "Failed to load statistics",
				});
				console.error("Failed to load statistics:", error);
			}
		};

		this.changeHandler = render;

		this.monthInput.addEventListener("change", this.changeHandler);

		render();
	}

	onClose() {
		if (this.monthInput && this.changeHandler) {
			this.monthInput.removeEventListener("change", this.changeHandler);
		}
		this.monthInput = null;
		this.changeHandler = null;
		this.contentEl.empty();
	}
}
