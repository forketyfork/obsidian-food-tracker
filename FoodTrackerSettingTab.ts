import { App, PluginSettingTab, Setting } from "obsidian";
import type FoodTrackerPlugin from "./FoodTrackerPlugin";
import NutritionTally from "./NutritionTally";
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

               new Setting(containerEl)
                       .setName("Food tag")
                       .setDesc("Tag used to mark food entries")
                       .addText(text =>
                               text
                                       .setValue(this.plugin.settings.foodTag)
                                       .onChange(async value => {
                                               const tag = value.startsWith("#") ? value : `#${value}`;
                                               this.plugin.settings.foodTag = tag;
                                               this.plugin.foodSuggest.updateTagRegex(tag);
                                               this.plugin.nutritionTally = new NutritionTally(
                                                       this.plugin.nutrientCache,
                                                       tag,
                                               );
                                               await this.plugin.saveSettings();
                                       })
                       );
	}
}
