import { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { extractMultilineGoalsHighlightRanges } from "./GoalsHighlightCore";
import { SettingsService } from "./SettingsService";
import { Subscription } from "rxjs";
import { Component } from "obsidian";

/**
 * CodeMirror extension that highlights values in goals files
 * Provides visual feedback for nutrition goal values
 * Improved performance by avoiding expensive file detection
 */
export default class GoalsHighlightExtension extends Component {
	private settingsService: SettingsService;
	private goalsFile: string = "";
	private subscription: Subscription;

	constructor(
		settingsService: SettingsService,
		private getActiveFilePath: () => string | null
	) {
		super();
		this.settingsService = settingsService;
	}

	onload() {
		this.subscription = this.settingsService.goalsFile$.subscribe(goalsFile => {
			this.goalsFile = goalsFile;
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

	/**
	 * Creates the CodeMirror extension for goals highlighting
	 * Uses efficient file path checking instead of content scanning
	 */
	createExtension(): Extension {
		const goalsValueDecoration = Decoration.mark({
			class: "food-tracker-goals-value",
		});

		const getGoalsFile = () => this.goalsFile;
		const getActiveFilePath = this.getActiveFilePath;

		const goalsHighlightPlugin = ViewPlugin.fromClass(
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
				 * Scans visible text for goals entries and creates decorations for highlighting
				 * Uses efficient file path checking instead of expensive content scanning
				 */
				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();

					const goalsFile = getGoalsFile();
					const activeFilePath = getActiveFilePath();

					// Early return if no goals file configured or not in the goals file
					if (!goalsFile || !activeFilePath) {
						return builder.finish();
					}

					// Check if we're in the goals file by path comparison
					const isGoalsFile = activeFilePath === goalsFile || activeFilePath.endsWith("/" + goalsFile);

					if (!isGoalsFile) {
						return builder.finish();
					}

					for (let { from, to } of view.visibleRanges) {
						const text = view.state.doc.sliceString(from, to);

						// Extract highlight ranges using the pure function
						const ranges = extractMultilineGoalsHighlightRanges(text, from);

						// Convert ranges to CodeMirror decorations
						for (const range of ranges) {
							builder.add(range.start, range.end, goalsValueDecoration);
						}
					}

					return builder.finish();
				}
			},
			{
				decorations: v => v.decorations,
			}
		);

		return goalsHighlightPlugin;
	}
}
