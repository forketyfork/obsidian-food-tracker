import { App, PluginSettingTab, Setting } from "obsidian";
import type FoodTrackerPlugin from "./FoodTrackerPlugin";
export default class FoodTrackerSettingTab extends PluginSettingTab {
	plugin: FoodTrackerPlugin;

	constructor(app: App, plugin: FoodTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Nutrient directory")
			.setDesc("Directory where nutrient files will be created")
			.addText(text =>
				text.setValue(this.plugin.settings.nutrientDirectory).onChange(async value => {
					this.plugin.settings.nutrientDirectory = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
