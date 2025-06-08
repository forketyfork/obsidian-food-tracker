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

		new Setting(containerEl)
			.setName("Nutrition tally display")
			.setDesc("Choose where to display the nutrition tally")
			.addDropdown(dropdown =>
				dropdown
					.addOption("status-bar", "Status bar")
					.addOption("document", "In document")
					.setValue(this.plugin.settings.tallyDisplayMode)
					.onChange(async value => {
						this.plugin.settings.tallyDisplayMode = value as "status-bar" | "document";
						await this.plugin.saveSettings();
					})
			);
	}
}
