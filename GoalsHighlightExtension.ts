import { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { extractMultilineGoalsHighlightRanges } from "./GoalsHighlightCore";
import { SettingsService } from "./SettingsService";
import { Subscription } from "rxjs";

/**
 * CodeMirror extension that highlights values in goals files
 * Provides visual feedback for nutrition goal values
 */
export default class GoalsHighlightExtension {
	private settingsService: SettingsService;
	private goalsFile: string = "";
	private subscription: Subscription;

	constructor(settingsService: SettingsService) {
		this.settingsService = settingsService;

		// Subscribe to goals file changes
		this.subscription = this.settingsService.goalsFile$.subscribe(goalsFile => {
			this.goalsFile = goalsFile;
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
		const goalsValueDecoration = Decoration.mark({
			class: "goals-value",
		});

		const getGoalsFile = () => this.goalsFile;

		const goalsHighlightPlugin = ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;

				constructor(view: EditorView) {
					this.decorations = this.buildDecorations(view);
				}

				update(update: ViewUpdate) {
					// Always rebuild decorations when document changes or viewport changes
					// This ensures highlighting updates when switching files
					if (update.docChanged || update.viewportChanged) {
						this.decorations = this.buildDecorations(update.view);
					}
				}

				/**
				 * Scans visible text for goals entries and creates decorations for highlighting
				 * Uses a simple heuristic to detect if we're in a goals file
				 */
				buildDecorations(view: EditorView): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>();

					const goalsFile = getGoalsFile();
					if (!goalsFile) {
						return builder.finish();
					}

					// Get the full document text to check if it looks like a goals file
					const docText = view.state.doc.toString();

					// Simple heuristic: if the document contains goal-like patterns, highlight it
					// This is more reliable than trying to get the file path from CodeMirror
					const goalPatterns = /^(calories|fats|protein|carbs|fiber|sugar|sodium):\s*\d+/m;
					if (!goalPatterns.test(docText)) {
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
