import { App, PluginSettingTab, Setting, normalizePath } from "obsidian";
import type FoodTrackerPlugin from "./FoodTrackerPlugin";
import FolderSuggest from "./FolderSuggest";
import FileSuggest from "./FileSuggest";
/**
 * Settings tab for configuring the Food Tracker plugin
 * Provides options for nutrient directory, display mode, and food tag
 */
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
			.addText(text => {
				text.setValue(this.plugin.settings.nutrientDirectory).onChange(async value => {
					this.plugin.settings.nutrientDirectory = normalizePath(value);
					await this.plugin.saveSettings();
				});
				new FolderSuggest(this.app, text.inputEl);
			});

		new Setting(containerEl)
			.setName("Nutrition total display")
			.setDesc("Choose where to display the nutrition total")
			.addDropdown(dropdown =>
				dropdown
					.addOption("status-bar", "Status bar")
					.addOption("document", "In document")
					.setValue(this.plugin.settings.totalDisplayMode)
					.onChange(async value => {
						this.plugin.settings.totalDisplayMode = value as "status-bar" | "document";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Food tag")
			.setDesc("Tag name for marking food entries (without #)")
			.addText(text =>
				text.setValue(this.plugin.settings.foodTag).onChange(async value => {
					this.plugin.settings.foodTag = value || "food";
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Workout tag")
			.setDesc("Tag name for logging workouts (without #)")
			.addText(text =>
				text.setValue(this.plugin.settings.workoutTag).onChange(async value => {
					this.plugin.settings.workoutTag = value || "workout";
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Show calorie hints")
			.setDesc("Display calculated calorie values at the end of food and workout entries")
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.showCalorieHints).onChange(async value => {
					this.plugin.settings.showCalorieHints = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Goals file")
			.setDesc("File containing daily nutrition goals")
			.addText(text => {
				text
					.setPlaceholder("nutrition-goals.md")
					.setValue(this.plugin.settings.goalsFile)
					.onChange(async value => {
						this.plugin.settings.goalsFile = normalizePath(value);
						await this.plugin.saveSettings();
					});
				new FileSuggest(this.app, text.inputEl);
			});
	}
}
