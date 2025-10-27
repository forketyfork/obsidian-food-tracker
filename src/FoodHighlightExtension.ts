import { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { extractMultilineHighlightRanges } from "./FoodHighlightCore";
import { SettingsService } from "./SettingsService";
import { Subscription } from "rxjs";
import { Component } from "obsidian";

/**
 * CodeMirror extension that highlights food amounts and nutrition values in the editor
 * Provides visual feedback for food entries and nutritional data
 * Uses reactive food tag updates via SettingsService
 */
export default class FoodHighlightExtension extends Component {
	private settingsService: SettingsService;
	private escapedFoodTag: string = "";
	private escapedWorkoutTag: string = "";
	private foodTag: string = "";
	private workoutTag: string = "";
	private subscription: Subscription;

	constructor(settingsService: SettingsService) {
		super();
		this.settingsService = settingsService;
	}

	onload() {
		this.subscription = this.settingsService.settings$.subscribe(settings => {
			this.foodTag = settings.foodTag;
			this.workoutTag = settings.workoutTag;
			this.escapedFoodTag = this.foodTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			this.escapedWorkoutTag = this.workoutTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		});
	}

	/**
	 * Clean up subscriptions when the extension is destroyed
	 */
	onunload(): void {
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

		const negativeKcalDecoration = Decoration.mark({
			class: "food-tracker-negative-kcal",
		});

		const getHighlightOptions = () => ({
			escapedFoodTag: this.escapedFoodTag,
			escapedWorkoutTag: this.escapedWorkoutTag,
			foodTag: this.foodTag,
			workoutTag: this.workoutTag,
		});

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
				 * Uses the extracted FoodHighlightCore for testable highlighting logic
				 */
				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();

					// Get current escaped tags from plugin instance through closure
					const { escapedFoodTag, escapedWorkoutTag, foodTag, workoutTag } = getHighlightOptions();

					// Skip if tags are not yet initialized
					if (!escapedFoodTag || !escapedWorkoutTag || !foodTag || !workoutTag) {
						return builder.finish();
					}

					for (let { from, to } of view.visibleRanges) {
						const text = view.state.doc.sliceString(from, to);

						// Extract highlight ranges using the pure function
						const ranges = extractMultilineHighlightRanges(text, from, {
							escapedFoodTag,
							escapedWorkoutTag,
							foodTag,
							workoutTag,
						});

						// Convert ranges to CodeMirror decorations
						for (const range of ranges) {
							let decoration;
							if (range.type === "negative-kcal") {
								decoration = negativeKcalDecoration;
							} else if (range.type === "nutrition") {
								decoration = nutritionValueDecoration;
							} else {
								decoration = foodAmountDecoration;
							}
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
