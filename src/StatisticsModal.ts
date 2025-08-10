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
		const { contentEl } = this;
		contentEl.empty();

		const now = new Date();
		const monthInput = contentEl.createEl("input", { type: "month" });
		monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

		const tableContainer = contentEl.createDiv();

		const render = async () => {
			tableContainer.empty();
			const [yearStr, monthStr] = monthInput.value.split("-");
			const year = Number(yearStr);
			const month = Number(monthStr);
			const stats = await this.statsService.getMonthlyStats(year, month);
			const table = tableContainer.createEl("table");
			for (const stat of stats) {
				const row = table.createEl("tr");
				row.createEl("td", { text: stat.date });
				const cell = row.createEl("td");
				if (stat.element) {
					cell.appendChild(stat.element);
				}
			}
		};

		monthInput.addEventListener("change", () => {
			void render();
		});

		void render();
	}

	onClose() {
		this.contentEl.empty();
	}
}
