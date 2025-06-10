import { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { createNutritionValueRegex } from "./constants";
import { SettingsService } from "./SettingsService";
import { Subscription } from "rxjs";

/**
 * CodeMirror extension that highlights food amounts and nutrition values in the editor
 * Provides visual feedback for food entries and nutritional data
 * Uses reactive food tag updates via SettingsService
 */
export default class FoodHighlightExtension {
	private settingsService: SettingsService;
	private inlineNutritionRegex: RegExp;
	private linkedRegex: RegExp;
	private subscription: Subscription;

	constructor(settingsService: SettingsService) {
		this.settingsService = settingsService;

		// Subscribe to food tag changes and update regexes
		this.subscription = this.settingsService.escapedFoodTag$.subscribe(escapedFoodTag => {
			this.updateRegexes(escapedFoodTag);
		});
	}

	/**
	 * Updates regex patterns when the food tag changes
	 */
	private updateRegexes(escapedFoodTag: string): void {
		this.inlineNutritionRegex = new RegExp(
			`#${escapedFoodTag}\\s+(?!\\[\\[)([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar)(?:\\s+\\d+(?:\\.\\d+)?(?:kcal|fat|prot|carbs|sugar))*)`,
			"i"
		);
		this.linkedRegex = new RegExp(
			`#${escapedFoodTag}\\s+(?:\\[\\[[^\\]]+\\]\\]|[^\\s]+)\\s+(\\d+(?:\\.\\d+)?(?:kg|lb|cups?|tbsp|tsp|ml|oz|g|l))`,
			"i"
		);
	}

	/**
	 * Clean up subscriptions when the extension is destroyed
	 */
	destroy(): void {
		if (this.subscription) {
			this.subscription.unsubscribe();
		}
	}

	createExtension(): Extension {
		const foodAmountDecoration = Decoration.mark({
			class: "food-value",
		});

		const nutritionValueDecoration = Decoration.mark({
			class: "food-nutrition-value",
		});

		const getInlineNutritionRegex = () => this.inlineNutritionRegex;
		const getLinkedRegex = () => this.linkedRegex;

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

				/**
				 * Scans visible text for food entries and creates decorations for highlighting
				 * Handles both inline nutrition format and linked format
				 */
				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();

					// Get current regex patterns from plugin instance through closure
					const inlineNutritionRegex = getInlineNutritionRegex();
					const linkedRegex = getLinkedRegex();

					// Skip if regexes are not yet initialized
					if (!inlineNutritionRegex || !linkedRegex) {
						return builder.finish();
					}

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
								// Match linked food pattern: #foodtag [[food-name]] amount OR #foodtag food-name amount
								const linkedMatch = linkedRegex.exec(line);
								if (linkedMatch) {
									const amountMatch = linkedMatch[1];
									const amountStart = lineStart + line.indexOf(amountMatch);
									const amountEnd = amountStart + amountMatch.length;
									builder.add(amountStart, amountEnd, foodAmountDecoration);
								}
								// Reset regex for next use
								linkedRegex.lastIndex = 0;
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
