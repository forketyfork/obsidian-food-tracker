import { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { createNutritionValueRegex } from "./constants";

/**
 * CodeMirror extension that highlights food amounts and nutrition values in the editor
 * Provides visual feedback for food entries and nutritional data
 */
export default class FoodHighlightExtension {
	private inlineNutritionRegex: RegExp;
	private traditionalRegex: RegExp;

	constructor(inlineNutritionRegex: RegExp, traditionalRegex: RegExp) {
		this.inlineNutritionRegex = inlineNutritionRegex;
		this.traditionalRegex = traditionalRegex;
	}

	updateRegexes(inlineNutritionRegex: RegExp, traditionalRegex: RegExp): void {
		this.inlineNutritionRegex = inlineNutritionRegex;
		this.traditionalRegex = traditionalRegex;
	}

	createExtension(): Extension {
		const foodAmountDecoration = Decoration.mark({
			class: "food-value",
		});

		const nutritionValueDecoration = Decoration.mark({
			class: "food-nutrition-value",
		});

		const getInlineNutritionRegex = () => this.inlineNutritionRegex;
		const getTraditionalRegex = () => this.traditionalRegex;

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
				 * Handles both inline nutrition format and traditional linked format
				 */
				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();

					// Get current regex patterns from plugin instance through closure
					const inlineNutritionRegex = getInlineNutritionRegex();
					const traditionalRegex = getTraditionalRegex();

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
