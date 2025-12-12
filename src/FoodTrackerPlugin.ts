import { Plugin, MarkdownView, TFile, addIcon, Platform } from "obsidian";
import FoodTrackerSettingTab from "./FoodTrackerSettingTab";
import NutrientModal from "./NutrientModal";
import NutrientCache from "./NutrientCache";
import FoodSuggest from "./FoodSuggest";
import NutritionTotal from "./NutritionTotal";
import FoodHighlightExtension from "./FoodHighlightExtension";
import FoodHighlightPostProcessor from "./FoodHighlightPostProcessor";
import GoalsHighlightExtension from "./GoalsHighlightExtension";
import DocumentTotalManager from "./DocumentTotalManager";
import { SettingsService, FoodTrackerPluginSettings, DEFAULT_SETTINGS } from "./SettingsService";
import GoalsService from "./GoalsService";
import { FOOD_TRACKER_ICON_NAME, FOOD_TRACKER_SVG_CONTENT } from "./icon";
import StatisticsModal from "./StatisticsModal";
import StatsService from "./StatsService";
import FrontmatterTotalsService from "./FrontmatterTotalsService";

export default class FoodTrackerPlugin extends Plugin {
	settings: FoodTrackerPluginSettings;
	nutrientCache: NutrientCache;
	foodSuggest: FoodSuggest;
	nutritionTotal: NutritionTotal;
	statusBarItem: HTMLElement;
	documentTotalManager: DocumentTotalManager;
	settingsService: SettingsService;
	goalsService: GoalsService;
	private statsService: StatsService;
	private frontmatterTotalsService: FrontmatterTotalsService;
	private foodHighlightExtension: FoodHighlightExtension;
	private foodHighlightPostProcessor: FoodHighlightPostProcessor;
	private goalsHighlightExtension: GoalsHighlightExtension;

	async onload() {
		// Register the Food Tracker icon
		addIcon(FOOD_TRACKER_ICON_NAME, FOOD_TRACKER_SVG_CONTENT);

		await this.loadSettings();
		this.initializeCore();
		this.setupEventListeners();
		this.registerCodeMirrorExtensions();
		this.registerMarkdownPostProcessors();
	}

	/**
	 * Initialize core services and components
	 */
	private initializeCore(): void {
		// Initialize nutrient cache
		this.nutrientCache = new NutrientCache(this.app, this.settings.nutrientDirectory);
		this.nutrientCache.initialize();

		// Initialize settings service
		this.settingsService = new SettingsService();
		this.settingsService.initialize(this.settings);

		// Initialize goals service
		this.goalsService = new GoalsService(this.app, this.settings.goalsFile || "");
		// Delay goals loading until vault is ready
		this.app.workspace.onLayoutReady(() => {
			void this.goalsService.loadGoals();
			// Update nutrition totals when workspace is ready
			void this.updateNutritionTotal();
		});

		// Initialize UI components
		this.initializeUIComponents();

		// Register commands and tabs
		this.registerCommandsAndTabs();
	}

	/**
	 * Initialize UI components and status bar
	 */
	private initializeUIComponents(): void {
		// Register food autocomplete
		this.foodSuggest = new FoodSuggest(this.app, this.settingsService, this.nutrientCache);
		this.registerEditorSuggest(this.foodSuggest);

		// Initialize nutrition total
		this.nutritionTotal = new NutritionTotal(this.nutrientCache);
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText("");

		// Initialize document total manager
		this.documentTotalManager = new DocumentTotalManager();

		// Initialize frontmatter totals service
		this.frontmatterTotalsService = new FrontmatterTotalsService(
			this.app,
			this.nutrientCache,
			this.settingsService,
			this.goalsService
		);

		// Initialize stats service
		this.statsService = new StatsService(
			this.app,
			this.nutritionTotal,
			this.settingsService,
			this.goalsService,
			this.nutrientCache
		);

		// Add ribbon button for statistics
		this.addRibbonIcon(FOOD_TRACKER_ICON_NAME, "Open nutrition statistics", () => {
			new StatisticsModal(this.app, this.statsService).open();
		});
	}

	/**
	 * Register commands and settings tab
	 */
	private registerCommandsAndTabs(): void {
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

	/**
	 * Setup all event listeners for file watching and updates
	 */
	private setupEventListeners(): void {
		this.setupNutrientCacheEventListeners();
		this.setupNutritionUpdateEventListeners();
	}

	/**
	 * Setup event listeners for nutrient cache file watching
	 */
	private setupNutrientCacheEventListeners(): void {
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
					this.nutrientCache.refresh();
				}
			})
		);

		// Register metadata cache events to handle frontmatter changes
		this.registerEvent(
			this.app.metadataCache.on("changed", file => {
				if (this.nutrientCache.isNutrientFile(file)) {
					this.nutrientCache.handleMetadataChange(file);
					this.frontmatterTotalsService.updateNotesReferencingNutrient(file.basename);
				}
			})
		);

		const onResolved = () => {
			this.nutrientCache.refresh();
			void this.updateNutritionTotal();
			this.app.metadataCache.off("resolved", onResolved);
		};
		this.registerEvent(this.app.metadataCache.on("resolved", onResolved));
	}

	/**
	 * Setup event listeners for nutrition total updates
	 */
	private setupNutritionUpdateEventListeners(): void {
		// Update nutrition total and frontmatter when files change
		this.registerEvent(
			this.app.vault.on("modify", file => {
				void this.updateNutritionTotal();
				if (file instanceof TFile) {
					this.frontmatterTotalsService.updateFrontmatterTotals(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("modify", file => {
				if (file.path === this.settings.goalsFile || file.name === this.settings.goalsFile) {
					void this.goalsService.loadGoals();
					void this.updateNutritionTotal();
				}
			})
		);

		// Update nutrition total when a file is opened
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				void this.updateNutritionTotal();
			})
		);
	}

	/**
	 * Register CodeMirror extensions for highlighting
	 */
	private registerCodeMirrorExtensions(): void {
		// Register CodeMirror extension for food amount highlighting
		this.foodHighlightExtension = new FoodHighlightExtension(this.app, this.settingsService, this.nutrientCache);
		this.addChild(this.foodHighlightExtension);
		this.registerEditorExtension(this.foodHighlightExtension.createExtension());

		// Register CodeMirror extension for goals highlighting
		this.goalsHighlightExtension = new GoalsHighlightExtension(
			this.settingsService,
			() => this.app.workspace.getActiveFile()?.path ?? null
		);
		this.addChild(this.goalsHighlightExtension);
		this.registerEditorExtension(this.goalsHighlightExtension.createExtension());
	}

	/**
	 * Register markdown post-processors for view mode highlighting
	 */
	private registerMarkdownPostProcessors(): void {
		this.foodHighlightPostProcessor = new FoodHighlightPostProcessor(
			this.app,
			this.settingsService,
			this.nutrientCache
		);
		this.addChild(this.foodHighlightPostProcessor);

		this.registerMarkdownPostProcessor((el, ctx) => {
			this.foodHighlightPostProcessor.process(el, ctx);
		});
	}

	onunload() {
		this.documentTotalManager.remove();
		this.foodSuggest?.suggestionCore?.destroy();
		this.frontmatterTotalsService?.cancelPendingUpdates();
	}

	async loadSettings() {
		const savedData = (await this.loadData()) as Partial<FoodTrackerPluginSettings>;

		// Create mobile-aware default settings
		const mobileAwareDefaults = {
			...DEFAULT_SETTINGS,
			// On mobile devices, default to "document" display mode for better visibility
			totalDisplayMode: Platform.isMobile ? "document" : DEFAULT_SETTINGS.totalDisplayMode,
		} as FoodTrackerPluginSettings;

		this.settings = Object.assign({}, mobileAwareDefaults, savedData);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		if (this.nutrientCache) {
			this.nutrientCache.updateNutrientDirectory(this.settings.nutrientDirectory);
		}

		// Recreate nutrition total with new directory
		if (this.nutritionTotal) {
			this.nutritionTotal = new NutritionTotal(this.nutrientCache);
		}

		if (this.goalsService) {
			this.goalsService.setGoalsFile(this.settings.goalsFile || "");
			await this.goalsService.loadGoals();
		}

		// Goals highlighting extension automatically updates via SettingsService subscription

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

			const content = await this.app.vault.cachedRead(activeView.file);
			const totalElement = this.nutritionTotal.calculateTotalNutrients(
				content,
				this.settingsService.currentEscapedFoodTag,
				true,
				this.goalsService.currentGoals,
				this.settingsService.currentEscapedWorkoutTag,
				true,
				true
			);

			if (this.settings.totalDisplayMode === "status-bar") {
				if (this.statusBarItem) {
					this.statusBarItem.empty();
					if (totalElement) {
						this.statusBarItem.appendChild(totalElement);
					}
				}
				this.documentTotalManager.remove();
			} else {
				if (this.statusBarItem) this.statusBarItem.setText("");
				this.documentTotalManager.show(totalElement, activeView);
			}
		} catch (error) {
			console.error("Error updating nutrition total:", error);
			this.clearTotal();
		}
	}

	private clearTotal(): void {
		if (this.statusBarItem) this.statusBarItem.setText("");
		this.documentTotalManager.remove();
	}
}
