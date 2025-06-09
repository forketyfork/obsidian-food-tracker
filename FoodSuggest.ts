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
import { FoodSuggestionCore, NutrientProvider } from "./FoodSuggestionCore";

/**
 * Adapter to bridge NutrientCache to the NutrientProvider interface
 * Allows FoodSuggestionCore to work with the plugin's nutrient cache
 */
class NutrientCacheAdapter implements NutrientProvider {
	constructor(private nutrientCache: NutrientCache) {}

	getNutrientNames(): string[] {
		return this.nutrientCache.getNutrientNames();
	}

	getFileNameFromNutrientName(nutrientName: string): string | null {
		return this.nutrientCache.getFileNameFromNutrientName(nutrientName);
	}
}

/**
 * Obsidian editor suggest implementation for food autocompletion
 * Provides suggestions for food names, measures, and nutrition keywords
 */
export default class FoodSuggest extends EditorSuggest<string> {
	private nutrientCacheAdapter: NutrientCacheAdapter;
	private suggestionCore: FoodSuggestionCore;
	private currentContext?: "measure" | "nutrition";

	constructor(app: App, foodTag: string, nutrientCache: NutrientCache) {
		super(app);
		this.nutrientCacheAdapter = new NutrientCacheAdapter(nutrientCache);
		this.suggestionCore = new FoodSuggestionCore(foodTag);
	}

	updateFoodTag(foodTag: string): void {
		this.suggestionCore.updateFoodTag(foodTag);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const trigger = this.suggestionCore.analyzeTrigger(line, cursor.ch);

		if (!trigger) return null;

		// Store the context for use in getSuggestions
		this.currentContext = trigger.context;

		return {
			start: { line: cursor.line, ch: trigger.startOffset },
			end: cursor,
			query: trigger.query,
		};
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		return this.suggestionCore.getSuggestions(context.query, this.nutrientCacheAdapter, this.currentContext);
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
			replacement = this.suggestionCore.getFoodNameReplacement(nutrient, this.nutrientCacheAdapter);
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
