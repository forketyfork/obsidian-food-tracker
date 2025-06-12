import { Plugin, MarkdownView, TFile } from "obsidian";
import FoodTrackerSettingTab from "./FoodTrackerSettingTab";
import NutrientModal from "./NutrientModal";
import NutrientCache from "./NutrientCache";
import FoodSuggest from "./FoodSuggest";
import NutritionTotal from "./NutritionTotal";
import FoodHighlightExtension from "./FoodHighlightExtension";
import DocumentTotalManager from "./DocumentTotalManager";
import { SettingsService, FoodTrackerPluginSettings, DEFAULT_SETTINGS } from "./SettingsService";
import GoalsService from "./GoalsService";

export default class FoodTrackerPlugin extends Plugin {
	settings: FoodTrackerPluginSettings;
	nutrientCache: NutrientCache;
	foodSuggest: FoodSuggest;
	nutritionTotal: NutritionTotal;
	statusBarItem: HTMLElement;
	documentTotalManager: DocumentTotalManager;
	settingsService: SettingsService;
	goalsService: GoalsService;
	private foodHighlightExtension: FoodHighlightExtension;

	async onload() {
		await this.loadSettings();

		this.nutrientCache = new NutrientCache(this.app, this.settings.nutrientDirectory);
		await this.nutrientCache.initialize();

		// Initialize settings service first
		this.settingsService = new SettingsService();
		this.settingsService.initialize(this.settings);

		this.goalsService = new GoalsService(this.app, this.settings.goalsFile);
		await this.goalsService.loadGoals();

		// Register food autocomplete
		this.foodSuggest = new FoodSuggest(this.app, this.settingsService, this.nutrientCache);
		this.registerEditorSuggest(this.foodSuggest);

		// Initialize nutrition total
		this.nutritionTotal = new NutritionTotal(this.nutrientCache);
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.innerHTML = "";

		// Initialize document total manager
		this.documentTotalManager = new DocumentTotalManager();

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
				if (
					file instanceof TFile &&
					(this.nutrientCache.isNutrientFile(file) || oldPath.startsWith(this.settings.nutrientDirectory + "/"))
				) {
					this.nutrientCache.handleRename(file, oldPath);
				} else if (oldPath.startsWith(this.settings.nutrientDirectory + "/")) {
					// If it's not a file but was in nutrient directory, do a full refresh
					void this.nutrientCache.refresh();
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
				void this.nutrientCache.refresh();
			})
		);

		// Update nutrition total when files change
		this.registerEvent(
			this.app.vault.on("modify", () => {
				void this.updateNutritionTotal();
			})
		);

		this.registerEvent(
			this.app.vault.on("modify", file => {
				if (file.path === this.settings.goalsFile) {
					void this.goalsService.loadGoals();
					void this.updateNutritionTotal();
				}
			})
		);

		// Update nutrition total when active file changes
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				void this.updateNutritionTotal();
			})
		);

		// Register CodeMirror extension for food amount highlighting
		this.foodHighlightExtension = new FoodHighlightExtension(this.settingsService);
		this.registerEditorExtension(this.foodHighlightExtension.createExtension());

		// Initial total update
		void this.updateNutritionTotal();
	}

	onunload() {
		this.documentTotalManager.remove();
		if (this.foodHighlightExtension) {
			this.foodHighlightExtension.destroy();
		}
		this.foodSuggest?.suggestionCore?.destroy();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<FoodTrackerPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		if (this.nutrientCache) {
			await this.nutrientCache.updateNutrientDirectory(this.settings.nutrientDirectory);
		}

		// Recreate nutrition total with new directory
		if (this.nutritionTotal) {
			this.nutritionTotal = new NutritionTotal(this.nutrientCache);
		}

		if (this.goalsService) {
			this.goalsService.setGoalsFile(this.settings.goalsFile);
			await this.goalsService.loadGoals();
		}

		// Update settings service
		if (this.settingsService) {
			this.settingsService.updateSettings(this.settings);
		}

		// Update total display when settings change
		void this.updateNutritionTotal();
	}

	/**
	 * Calculates and displays nutrition totals for the current document
	 * Updates either the status bar or an in-document element based on settings
	 */
	private async updateNutritionTotal(): Promise<void> {
		try {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView?.file) {
				this.clearTotal();
				return;
			}

			const content = await this.app.vault.read(activeView.file);
			const totalText = this.nutritionTotal.calculateTotalNutrients(
				content,
				this.settingsService.currentEscapedFoodTag,
				true,
				this.goalsService.currentGoals
			);

			if (this.settings.totalDisplayMode === "status-bar") {
				if (this.statusBarItem) this.statusBarItem.innerHTML = totalText;
				this.documentTotalManager.remove();
			} else {
				if (this.statusBarItem) this.statusBarItem.innerHTML = "";
				this.documentTotalManager.show(totalText, activeView);
			}
		} catch (error) {
			console.error("Error updating nutrition total:", error);
			this.clearTotal();
		}
	}

	private clearTotal(): void {
		if (this.statusBarItem) this.statusBarItem.innerHTML = "";
		this.documentTotalManager.remove();
	}
}
