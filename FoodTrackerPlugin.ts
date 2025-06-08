import { Plugin } from "obsidian";
import FoodTrackerSettingTab from "./FoodTrackerSettingTab";
import NutrientModal from "./NutrientModal";
interface FoodTrackerPluginSettings {
	nutrientDirectory: string;
}

const DEFAULT_SETTINGS: FoodTrackerPluginSettings = {
	nutrientDirectory: "nutrients",
};

export default class FoodTrackerPlugin extends Plugin {
	settings: FoodTrackerPluginSettings;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new FoodTrackerSettingTab(this.app, this));

		// Add nutrient command
		this.addCommand({
			id: "add-nutrient",
			name: "Add nutrient",
			callback: () => {
				new NutrientModal(this.app, this).open();
			},
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<FoodTrackerPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
