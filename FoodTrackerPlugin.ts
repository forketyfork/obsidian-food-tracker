import { Plugin, MarkdownView } from "obsidian";
import FoodTrackerSettingTab from "./FoodTrackerSettingTab";
import NutrientModal from "./NutrientModal";
import NutrientCache from "./NutrientCache";
import FoodSuggest from "./FoodSuggest";
import NutritionTotal from "./NutritionTotal";
import FoodHighlightExtension from "./FoodHighlightExtension";
import { SPECIAL_CHARS_REGEX } from "./constants";
interface FoodTrackerPluginSettings {
	nutrientDirectory: string;
	totalDisplayMode: "status-bar" | "document";
	foodTag: string;
}

const DEFAULT_SETTINGS: FoodTrackerPluginSettings = {
	nutrientDirectory: "nutrients",
	totalDisplayMode: "status-bar",
	foodTag: "food",
};

export default class FoodTrackerPlugin extends Plugin {
	settings: FoodTrackerPluginSettings;
	nutrientCache: NutrientCache;
	foodSuggest: FoodSuggest;
	nutritionTotal: NutritionTotal;
	statusBarItem: HTMLElement;
	documentTotalElement: HTMLElement | null = null;
	private escapedFoodTag: string;
	private inlineNutritionRegex: RegExp;
	private linkedRegex: RegExp;
	private foodHighlightExtension: FoodHighlightExtension;

	async onload() {
		await this.loadSettings();
		this.updateEscapedFoodTag();

		this.nutrientCache = new NutrientCache(this.app, this.settings.nutrientDirectory);
		this.nutrientCache.initialize();

		// Register food autocomplete
		this.foodSuggest = new FoodSuggest(this.app, this.settings.foodTag, this.nutrientCache);
		this.registerEditorSuggest(this.foodSuggest);

		// Initialize nutrition total
		this.nutritionTotal = new NutritionTotal(this.nutrientCache);
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

		// Update nutrition total when files change
		this.registerEvent(
			this.app.vault.on("modify", () => {
				void this.updateNutritionTotal();
			})
		);

		// Update nutrition total when active file changes
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				void this.updateNutritionTotal();
			})
		);

		// Register CodeMirror extension for food amount highlighting
		this.foodHighlightExtension = new FoodHighlightExtension(this.inlineNutritionRegex, this.linkedRegex);
		this.registerEditorExtension(this.foodHighlightExtension.createExtension());

		// Initial total update
		void this.updateNutritionTotal();
	}

	onunload() {
		this.removeDocumentTotal();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<FoodTrackerPluginSettings>);
		this.updateEscapedFoodTag();
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

		this.updateEscapedFoodTag();

		// Update food suggest with new food tag
		if (this.foodSuggest) {
			this.foodSuggest.updateFoodTag(this.settings.foodTag);
		}

		// Update total display when settings change
		void this.updateNutritionTotal();
	}

	/**
	 * Escapes special regex characters in the food tag and precompiles regex patterns for performance
	 * Called whenever the food tag setting changes
	 */
	updateEscapedFoodTag(): void {
		this.escapedFoodTag = this.settings.foodTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
		// Update precompiled regex patterns when food tag changes
		this.inlineNutritionRegex = new RegExp(
			`#${this.escapedFoodTag}\\s+(?!\\[\\[)([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar)(?:\\s+\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar))*)`,
			"i"
		);
		this.linkedRegex = new RegExp(
			`#${this.escapedFoodTag}\\s+(?:\\[\\[[^\\]]+\\]\\]|[^\\s]+)\\s+(\\d+(?:\\.\\d+)?(?:kg|lb|cups?|tbsp|tsp|ml|oz|g|l))`,
			"i"
		);
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
			const totalText = this.nutritionTotal.calculateTotalNutrients(content, this.escapedFoodTag, true);

			if (this.settings.totalDisplayMode === "status-bar") {
				this.statusBarItem?.setText(totalText);
				this.removeDocumentTotal();
			} else {
				this.statusBarItem?.setText("");
				this.showDocumentTotal(totalText, activeView);
			}
		} catch (error) {
			console.error("Error updating nutrition total:", error);
			this.clearTotal();
		}
	}

	private clearTotal(): void {
		this.statusBarItem?.setText("");
		this.removeDocumentTotal();
	}

	/**
	 * Creates and displays the nutrition total as an in-document element
	 * Positioned at the bottom of the document content
	 */
	private showDocumentTotal(totalText: string, view: MarkdownView): void {
		this.removeDocumentTotal();

		if (!totalText) {
			return;
		}

		const contentEl = view.contentEl;
		if (!contentEl) {
			return;
		}

		this.documentTotalElement = contentEl.createDiv({
			cls: "food-tracker-total",
		});

		this.documentTotalElement.textContent = totalText;

		// Append at the end of contentEl so it appears at the bottom
		contentEl.appendChild(this.documentTotalElement);
	}

	private removeDocumentTotal(): void {
		if (this.documentTotalElement) {
			this.documentTotalElement.remove();
			this.documentTotalElement = null;
		}
	}
}
