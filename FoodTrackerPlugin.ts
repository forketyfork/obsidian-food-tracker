import { Plugin } from "obsidian";
import FoodTrackerSettingTab from "./FoodTrackerSettingTab";
import NutrientModal from "./NutrientModal";
import NutrientCache from "./NutrientCache";
import FoodSuggest from "./FoodSuggest";
interface FoodTrackerPluginSettings {
	nutrientDirectory: string;
}

const DEFAULT_SETTINGS: FoodTrackerPluginSettings = {
	nutrientDirectory: "nutrients",
};

export default class FoodTrackerPlugin extends Plugin {
	settings: FoodTrackerPluginSettings;
	nutrientCache: NutrientCache;
	foodSuggest: FoodSuggest;

	async onload() {
		await this.loadSettings();

		this.nutrientCache = new NutrientCache(this.app, this.settings.nutrientDirectory);
		this.nutrientCache.initialize();

		// Register food autocomplete
		this.foodSuggest = new FoodSuggest(this);
		this.registerEditorSuggest(this.foodSuggest);

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

		// Register file watcher for nutrient directory
		this.registerEvent(
			this.app.vault.on("create", file => {
				if (this.nutrientCache.isNutrientFile(file)) {
					this.nutrientCache.updateCache(file, "create");
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", file => {
				if (this.nutrientCache.isNutrientFile(file)) {
					this.nutrientCache.updateCache(file, "delete");
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("modify", file => {
				if (this.nutrientCache.isNutrientFile(file)) {
					this.nutrientCache.updateCache(file, "modify");
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (this.nutrientCache.isNutrientFile(file) || oldPath.startsWith(this.settings.nutrientDirectory + "/")) {
					this.nutrientCache.refresh();
				}
			})
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<FoodTrackerPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		if (this.nutrientCache) {
			this.nutrientCache.updateNutrientDirectory(this.settings.nutrientDirectory);
		}
	}

	getNutrientNames(): string[] {
		return this.nutrientCache.getNutrientNames();
	}

	getFileNameFromNutrientName(nutrientName: string): string | null {
		return this.nutrientCache?.getFileNameFromNutrientName(nutrientName) ?? null;
	}
}
