import { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { extractMultilineHighlightRanges, extractInlineCalorieAnnotations, CalorieProvider } from "./FoodHighlightCore";
import { SettingsService } from "./SettingsService";
import { Subscription } from "rxjs";
import { Component } from "obsidian";
import NutrientCache from "./NutrientCache";

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
	private nutrientCache: NutrientCache;

	constructor(settingsService: SettingsService, nutrientCache: NutrientCache) {
		super();
		this.settingsService = settingsService;
		this.nutrientCache = nutrientCache;
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

		const calorieProvider: CalorieProvider = {
			getCaloriesForFood: (fileName: string) => {
				const normalized = fileName.trim();
				if (!normalized) {
					return null;
				}

				const data = this.nutrientCache.getNutritionData(normalized);
				const calories = data?.calories;
				return typeof calories === "number" && isFinite(calories) ? calories : null;
			},
		};

		class InlineCaloriesWidget extends WidgetType {
			private text: string;

			constructor(text: string) {
				super();
				this.text = text;
			}

			toDOM(): HTMLElement {
				const span = document.createElement("span");
				span.classList.add("food-tracker-inline-calories");
				span.textContent = ` (${this.text})`;
				return span;
			}
		}

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
					if (!escapedFoodTag || !foodTag) {
						return builder.finish();
					}

					for (let { from, to } of view.visibleRanges) {
						const text = view.state.doc.sliceString(from, to);

						// Extract highlight ranges using the pure function
						const options = {
							escapedFoodTag,
							escapedWorkoutTag,
							foodTag,
							workoutTag,
						};

						const ranges = extractMultilineHighlightRanges(text, from, options);

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

						const calorieAnnotations = extractInlineCalorieAnnotations(text, from, options, calorieProvider);

						for (const annotation of calorieAnnotations) {
							const widget = Decoration.widget({
								widget: new InlineCaloriesWidget(annotation.text),
								side: 1,
							});
							builder.add(annotation.position, annotation.position, widget);
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
