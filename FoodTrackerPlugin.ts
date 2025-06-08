import { Plugin, MarkdownView } from "obsidian";
import FoodTrackerSettingTab from "./FoodTrackerSettingTab";
import NutrientModal from "./NutrientModal";
import NutrientCache from "./NutrientCache";
import FoodSuggest from "./FoodSuggest";
import NutritionTally from "./NutritionTally";
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
	nutritionTally: NutritionTally;
	statusBarItem: HTMLElement;

	async onload() {
		await this.loadSettings();

		this.nutrientCache = new NutrientCache(this.app, this.settings.nutrientDirectory);
		this.nutrientCache.initialize();

		// Register food autocomplete
		this.foodSuggest = new FoodSuggest(this);
		this.registerEditorSuggest(this.foodSuggest);

		// Initialize nutrition tally
		this.nutritionTally = new NutritionTally(this.app, this);
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText("");

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

		// Register metadata cache events to handle frontmatter changes
		this.registerEvent(
			this.app.metadataCache.on("changed", file => {
				this.nutrientCache.handleMetadataChange(file);
			})
		);

		this.registerEvent(
			this.app.metadataCache.on("resolved", () => {
				// Refresh cache when metadata cache is fully resolved (on startup)
				this.nutrientCache.refresh();
			})
		);

		// Update nutrition tally when files change
		this.registerEvent(
			this.app.vault.on("modify", () => {
				void this.updateNutritionTally();
			})
		);

		// Update nutrition tally when active file changes
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				void this.updateNutritionTally();
			})
		);

		// Initial tally update
		void this.updateNutritionTally();
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

	private async updateNutritionTally(): Promise<void> {
		try {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView?.file) {
				this.statusBarItem?.setText("");
				return;
			}

			const tallyText = await this.nutritionTally.calculateTotalNutrients(activeView.file);
			this.statusBarItem?.setText(tallyText);
		} catch (error) {
			console.error("Error updating nutrition tally:", error);
			this.statusBarItem?.setText("");
		}
	}
}
