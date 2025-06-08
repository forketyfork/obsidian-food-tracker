import { Plugin } from "obsidian";
import FoodTrackerSettingTab from "./FoodTrackerSettingTab";
interface FoodTrackerPluginSettings {
	hello: string;
}

const DEFAULT_SETTINGS: FoodTrackerPluginSettings = {
	hello: "world",
};

export default class FoodTrackerPlugin extends Plugin {
	settings: FoodTrackerPluginSettings;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new FoodTrackerSettingTab(this.app, this));

		// Add an example command
		this.addCommand({
			id: "food-tracker-example-command",
			name: "Food Tracker something...",
			callback: () => {
				console.error("Test command");
			},
		});

		// Add ribbon icon
		this.addRibbonIcon("clipboard-list", "Food Tracker example ribbon action", () => {
			console.error("Test ribbon");
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<FoodTrackerPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
