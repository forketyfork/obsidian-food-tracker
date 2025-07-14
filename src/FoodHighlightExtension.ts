import { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { extractMultilineHighlightRanges } from "./FoodHighlightCore";
import { SettingsService } from "./SettingsService";
import { Subscription } from "rxjs";

/**
 * CodeMirror extension that highlights food amounts and nutrition values in the editor
 * Provides visual feedback for food entries and nutritional data
 * Uses reactive food tag updates via SettingsService
 */
export default class FoodHighlightExtension {
	private settingsService: SettingsService;
	private escapedFoodTag: string = "";
	private subscription: Subscription;

	constructor(settingsService: SettingsService) {
		this.settingsService = settingsService;

		// Subscribe to food tag changes
		this.subscription = this.settingsService.escapedFoodTag$.subscribe(escapedFoodTag => {
			this.escapedFoodTag = escapedFoodTag;
		});
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
			class: "food-tracker-value",
		});

		const nutritionValueDecoration = Decoration.mark({
			class: "food-tracker-nutrition-value",
		});

		const getEscapedFoodTag = () => this.escapedFoodTag;

		const foodHighlightPlugin = ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;

				constructor(view: EditorView) {
					this.decorations = this.buildDecorations(view);
				}

				update(update: ViewUpdate) {
					// Only rebuild decorations when document content changes
					if (update.docChanged) {
						this.decorations = this.buildDecorations(update.view);
					}
				}

				/**
				 * Scans visible text for food entries and creates decorations for highlighting
				 * Uses the extracted FoodHighlightCore for testable highlighting logic
				 */
				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();

					// Get current escaped food tag from plugin instance through closure
					const escapedFoodTag = getEscapedFoodTag();

					// Skip if food tag is not yet initialized
					if (!escapedFoodTag) {
						return builder.finish();
					}

					for (let { from, to } of view.visibleRanges) {
						const text = view.state.doc.sliceString(from, to);

						// Extract highlight ranges using the pure function
						const ranges = extractMultilineHighlightRanges(text, from, { escapedFoodTag });

						// Convert ranges to CodeMirror decorations
						for (const range of ranges) {
							const decoration = range.type === "nutrition" ? nutritionValueDecoration : foodAmountDecoration;
							builder.add(range.start, range.end, decoration);
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
