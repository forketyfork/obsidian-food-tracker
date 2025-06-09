import { Plugin, MarkdownView } from "obsidian";
import { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import FoodTrackerSettingTab from "./FoodTrackerSettingTab";
import NutrientModal from "./NutrientModal";
import NutrientCache from "./NutrientCache";
import FoodSuggest from "./FoodSuggest";
import NutritionTotal from "./NutritionTotal";
import { SPECIAL_CHARS_REGEX, createNutritionValueRegex } from "./constants";
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
	private traditionalRegex: RegExp;

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
		this.registerEditorExtension(this.createFoodHighlightExtension());

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

		// Update total display when settings change
		void this.updateNutritionTotal();
	}

	getNutrientNames(): string[] {
		return this.nutrientCache.getNutrientNames();
	}

	getFileNameFromNutrientName(nutrientName: string): string | null {
		return this.nutrientCache?.getFileNameFromNutrientName(nutrientName) ?? null;
	}

	getFoodTag(): string {
		return this.settings.foodTag;
	}

	getEscapedFoodTag(): string {
		return this.escapedFoodTag;
	}

	updateEscapedFoodTag(): void {
		this.escapedFoodTag = this.settings.foodTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
		// Update precompiled regex patterns when food tag changes
		this.inlineNutritionRegex = new RegExp(
			`#${this.escapedFoodTag}\\s+(?!\\[\\[)([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar)(?:\\s+\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar))*)`,
			"i"
		);
		this.traditionalRegex = new RegExp(
			`#${this.escapedFoodTag}\\s+(?:\\[\\[[^\\]]+\\]\\]|[^\\s]+)\\s+(\\d+(?:\\.\\d+)?(?:kg|lb|cups?|tbsp|tsp|ml|oz|g|l))`,
			"i"
		);
	}

	private async updateNutritionTotal(): Promise<void> {
		try {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView?.file) {
				this.clearTotal();
				return;
			}

			const content = await this.app.vault.read(activeView.file);
			const totalText = this.nutritionTotal.calculateTotalNutrients(content, this.getEscapedFoodTag(), true);

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

	createFoodHighlightExtension(): Extension {
		const foodAmountDecoration = Decoration.mark({
			class: "food-value",
		});

		const nutritionValueDecoration = Decoration.mark({
			class: "food-nutrition-value",
		});

		const inlineNutritionRegex = this.inlineNutritionRegex;
		const traditionalRegex = this.traditionalRegex;

		const foodHighlightPlugin = ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;

				constructor(view: EditorView) {
					this.decorations = this.buildDecorations(view);
				}

				update(update: ViewUpdate) {
					if (update.docChanged || update.viewportChanged) {
						this.decorations = this.buildDecorations(update.view);
					}
				}

				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();

					for (let { from, to } of view.visibleRanges) {
						const text = view.state.doc.sliceString(from, to);
						const lines = text.split("\n");
						let lineStart = from;

						for (const line of lines) {
							// Match food pattern with inline nutrition: #foodtag foodname 300kcal 20fat 10prot 30carbs 3sugar
							const inlineNutritionMatch = inlineNutritionRegex.exec(line);
							if (inlineNutritionMatch) {
								const nutritionString = inlineNutritionMatch[2];
								const nutritionStringStart = lineStart + line.indexOf(nutritionString);

								// Find and highlight each nutritional value within the nutrition string
								const nutritionValueRegex = createNutritionValueRegex();
								let match;

								while ((match = nutritionValueRegex.exec(nutritionString)) !== null) {
									const valueStart = nutritionStringStart + match.index;
									const valueEnd = valueStart + match[0].length;
									builder.add(valueStart, valueEnd, nutritionValueDecoration);
								}
								// Reset regex for next use
								inlineNutritionRegex.lastIndex = 0;
							} else {
								// Match traditional food pattern: #foodtag [[food-name]] amount OR #foodtag food-name amount
								const traditionalMatch = traditionalRegex.exec(line);
								if (traditionalMatch) {
									const amountMatch = traditionalMatch[1];
									const amountStart = lineStart + line.indexOf(amountMatch);
									const amountEnd = amountStart + amountMatch.length;
									builder.add(amountStart, amountEnd, foodAmountDecoration);
								}
								// Reset regex for next use
								traditionalRegex.lastIndex = 0;
							}
							lineStart += line.length + 1; // +1 for newline
						}
					}

					return builder.finish();
				}
			},
			{
				decorations: v => v.decorations,
			}
		);

		return foodHighlightPlugin;
	}
}
