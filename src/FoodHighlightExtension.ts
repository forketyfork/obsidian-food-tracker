import { Extension, Compartment } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { extractMultilineHighlightRanges, extractInlineCalorieAnnotations, CalorieProvider } from "./FoodHighlightCore";
import { SettingsService } from "./SettingsService";
import { Subscription } from "rxjs";
import { Component, App, MarkdownView } from "obsidian";
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
	private showCalorieHints: boolean = true;
	private subscription: Subscription;
	private nutrientCache: NutrientCache;
	private nutrientCacheUnsubscribe: (() => void) | null = null;
	private compartment: Compartment;
	private app: App;

	constructor(app: App, settingsService: SettingsService, nutrientCache: NutrientCache) {
		super();
		this.app = app;
		this.settingsService = settingsService;
		this.nutrientCache = nutrientCache;
		this.compartment = new Compartment();
	}

	onload() {
		this.subscription = this.settingsService.settings$.subscribe(settings => {
			this.foodTag = settings.foodTag;
			this.workoutTag = settings.workoutTag;
			this.showCalorieHints = settings.showCalorieHints;
			this.escapedFoodTag = this.foodTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			this.escapedWorkoutTag = this.workoutTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

			this.reconfigureEditors();
		});

		this.nutrientCacheUnsubscribe = this.nutrientCache.onChange(() => {
			this.reconfigureEditors();
		});
	}

	private reconfigureEditors(): void {
		this.app.workspace.iterateAllLeaves(leaf => {
			if (leaf.view instanceof MarkdownView && leaf.view.editor) {
				const editorView = (leaf.view.editor as { cm?: EditorView }).cm;
				if (editorView) {
					editorView.dispatch({
						effects: this.compartment.reconfigure(this.buildExtension()),
					});
				}
			}
		});
	}

	/**
	 * Clean up subscriptions when the extension is destroyed
	 */
	onunload(): void {
		if (this.subscription) {
			this.subscription.unsubscribe();
		}

		if (this.nutrientCacheUnsubscribe) {
			this.nutrientCacheUnsubscribe();
			this.nutrientCacheUnsubscribe = null;
		}
	}

	createExtension(): Extension {
		return this.compartment.of(this.buildExtension());
	}

	private buildExtension(): Extension {
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
			getServingSize: (fileName: string) => {
				const normalized = fileName.trim();
				if (!normalized) {
					return null;
				}

				const data = this.nutrientCache.getNutritionData(normalized);
				const servingSize = data?.serving_size;
				return typeof servingSize === "number" && isFinite(servingSize) ? servingSize : null;
			},
			getNutritionPer: (fileName: string) => {
				const normalized = fileName.trim();
				if (!normalized) {
					return null;
				}

				const data = this.nutrientCache.getNutritionData(normalized);
				const nutritionPer = data?.nutrition_per;
				return typeof nutritionPer === "number" && isFinite(nutritionPer) ? nutritionPer : null;
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
				span.textContent = ` ${this.text}`;
				return span;
			}
		}

		const getHighlightOptions = () => ({
			escapedFoodTag: this.escapedFoodTag,
			escapedWorkoutTag: this.escapedWorkoutTag,
			foodTag: this.foodTag,
			workoutTag: this.workoutTag,
			showCalorieHints: this.showCalorieHints,
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
					const { escapedFoodTag, escapedWorkoutTag, foodTag, workoutTag, showCalorieHints } = getHighlightOptions();

					// Skip if tags are not yet initialized
					if (!escapedFoodTag || !foodTag) {
						return builder.finish();
					}

					type DecorationItem = {
						from: number;
						to: number;
						decoration: Decoration;
					};

					const allDecorations: DecorationItem[] = [];

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

						// Convert ranges to decoration items
						for (const range of ranges) {
							let decoration;
							if (range.type === "negative-kcal") {
								decoration = negativeKcalDecoration;
							} else if (range.type === "nutrition") {
								decoration = nutritionValueDecoration;
							} else {
								decoration = foodAmountDecoration;
							}
							allDecorations.push({
								from: range.start,
								to: range.end,
								decoration,
							});
						}

						if (showCalorieHints) {
							const calorieAnnotations = extractInlineCalorieAnnotations(text, from, options, calorieProvider);

							for (const annotation of calorieAnnotations) {
								const widget = Decoration.widget({
									widget: new InlineCaloriesWidget(annotation.text),
									side: 1,
								});
								allDecorations.push({
									from: annotation.position,
									to: annotation.position,
									decoration: widget,
								});
							}
						}
					}

					allDecorations.sort((a, b) => a.from - b.from || a.to - b.to);

					for (const item of allDecorations) {
						builder.add(item.from, item.to, item.decoration);
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
