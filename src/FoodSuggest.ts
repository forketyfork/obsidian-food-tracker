import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
} from "obsidian";
import NutrientCache from "./NutrientCache";
import { FoodSuggestionCore } from "./FoodSuggestionCore";
import { SettingsService } from "./SettingsService";

/**
 * Obsidian editor suggest implementation for food autocompletion
 * Provides suggestions for food names, measures, and nutrition keywords
 */
export default class FoodSuggest extends EditorSuggest<string> {
	private nutrientCache: NutrientCache;
	suggestionCore: FoodSuggestionCore;
	private settingsService: SettingsService;
	private currentContext?: "measure" | "nutrition";
	private currentTagType?: "food" | "workout";

	constructor(app: App, settingsService: SettingsService, nutrientCache: NutrientCache) {
		super(app);
		this.nutrientCache = nutrientCache;
		this.settingsService = settingsService;
		this.suggestionCore = new FoodSuggestionCore(settingsService);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const trigger = this.suggestionCore.analyzeTrigger(line, cursor.ch);

		if (!trigger) return null;

		// Store the context and tag type for use in getSuggestions
		this.currentContext = trigger.context;
		this.currentTagType = trigger.tagType;

		return {
			start: { line: cursor.line, ch: trigger.startOffset },
			end: cursor,
			query: trigger.query,
		};
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		return this.suggestionCore.getSuggestions(
			context.query,
			this.nutrientCache,
			this.currentContext,
			this.currentTagType
		);
	}

	renderSuggestion(nutrient: string, el: HTMLElement): void {
		el.createEl("div", { text: nutrient });
	}

	/**
	 * Handles selection of a suggestion by inserting the appropriate replacement text
	 * Different replacement logic for food names vs nutrition/measure keywords
	 */
	selectSuggestion(nutrient: string, _evt: MouseEvent | KeyboardEvent): void {
		const context = this.context;
		if (!context) return;

		let replacement: string;

		if (this.suggestionCore.isNutritionKeyword(nutrient)) {
			replacement = this.suggestionCore.getNutritionKeywordReplacement(nutrient);
		} else {
			replacement = this.suggestionCore.getFoodNameReplacement(nutrient, this.nutrientCache);
		}

		context.editor.replaceRange(replacement, context.start, context.end);

		// Move cursor to the end of the replacement
		const newCursorPos = {
			line: context.start.line,
			ch: context.start.ch + replacement.length,
		};
		context.editor.setCursor(newCursorPos);
	}
}
