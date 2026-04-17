import { App, PluginSettingTab, Setting, moment, normalizePath } from "obsidian";
import type FoodTrackerPlugin from "./FoodTrackerPlugin";
import FolderSuggest from "./FolderSuggest";
import FileSuggest from "./FileSuggest";
import { DEFAULT_FRONTMATTER_FIELD_NAMES, type FrontmatterFieldNames } from "./SettingsService";

const obsidianMoment = moment as unknown as typeof import("moment");
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

		const dailyNoteSetting = new Setting(containerEl).setName("Daily note filename format");

		dailyNoteSetting.descEl.empty();
		dailyNoteSetting.descEl.createSpan({
			text: "Pattern used to identify daily notes (Moment.js tokens such as YYYY, MM, DD).",
		});

		const previewEl = dailyNoteSetting.descEl.createDiv({
			cls: "food-tracker-setting-preview",
		});
		const validationEl = dailyNoteSetting.descEl.createDiv({
			cls: "food-tracker-setting-validation",
		});

		dailyNoteSetting.addText(text => {
			const updatePreview = (rawValue: string) => {
				const value = rawValue?.trim() || "YYYY-MM-DD";
				const preview = obsidianMoment().format(value);
				previewEl.setText(`Preview for today: ${preview}`);

				const hasYear = /Y/.test(value);
				const hasMonth = /M/.test(value);
				const hasDay = /D/.test(value);
				const isValid = hasYear && hasMonth && hasDay;

				text.inputEl.toggleClass("food-tracker-input-error", !isValid);
				validationEl.setText(isValid ? "" : "Format should include year (Y), month (M), and day (D) tokens.");
			};

			text.setValue(this.plugin.settings.dailyNoteFormat).onChange(async value => {
				const formatValue = value?.trim() || "YYYY-MM-DD";
				this.plugin.settings.dailyNoteFormat = formatValue;
				updatePreview(formatValue);
				await this.plugin.saveSettings();
			});

			updatePreview(this.plugin.settings.dailyNoteFormat);
		});

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
			.setName("Link type")
			.setDesc("Type of links to insert when selecting nutrients from autocomplete")
			.addDropdown(dropdown =>
				dropdown
					.addOption("markdown", "Markdown links [name](path)")
					.addOption("wikilink", "Wikilinks [[name]]")
					.setValue(this.plugin.settings.linkType)
					.onChange(async value => {
						this.plugin.settings.linkType = value as "wikilink" | "markdown";
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

		this.addFrontmatterFieldNamesSection(containerEl);
	}

	private addFrontmatterFieldNamesSection(containerEl: HTMLElement): void {
		const detailsEl = containerEl.createEl("details", {
			cls: "food-tracker-settings-collapsible",
		});
		detailsEl.createEl("summary", {
			text: "Metadata field names",
			cls: "food-tracker-settings-collapsible-summary",
		});

		detailsEl.createEl("p", {
			cls: "food-tracker-settings-collapsible-desc setting-item-description",
			text: "Customize the frontmatter field names used to store nutrition totals in daily notes.",
		});

		const fieldConfigs: Array<{
			key: keyof FrontmatterFieldNames;
			name: string;
			desc: string;
		}> = [
			{ key: "calories", name: "Calories field", desc: "Field name for total calories" },
			{ key: "fats", name: "Fats field", desc: "Field name for total fats (g)" },
			{ key: "saturated_fats", name: "Saturated fats field", desc: "Field name for saturated fats (g)" },
			{ key: "protein", name: "Protein field", desc: "Field name for total protein (g)" },
			{ key: "carbs", name: "Carbs field", desc: "Field name for total carbohydrates (g)" },
			{ key: "fiber", name: "Fiber field", desc: "Field name for total fiber (g)" },
			{ key: "sugar", name: "Sugar field", desc: "Field name for total sugar (g)" },
			{ key: "sodium", name: "Sodium field", desc: "Field name for total sodium (mg)" },
		];

		for (const config of fieldConfigs) {
			new Setting(detailsEl)
				.setName(config.name)
				.setDesc(config.desc)
				.addText(text =>
					text
						.setPlaceholder(DEFAULT_FRONTMATTER_FIELD_NAMES[config.key])
						.setValue(this.plugin.settings.frontmatterFieldNames[config.key])
						.onChange(async value => {
							const frontmatterFieldNames = this.plugin.settings.frontmatterFieldNames;
							frontmatterFieldNames[config.key] = value;
							this.plugin.settingsService.updateFrontmatterFieldNames(frontmatterFieldNames);
							this.plugin.settings = {
								...this.plugin.settings,
								frontmatterFieldNames: this.plugin.settingsService.currentFrontmatterFieldNames,
							};
							await this.plugin.saveSettings();
						})
				);
		}
	}
}
