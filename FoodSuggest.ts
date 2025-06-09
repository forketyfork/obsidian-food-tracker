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
import { SPECIAL_CHARS_REGEX, LEADING_NUMBER_REGEX } from "./constants";

export default class FoodSuggest extends EditorSuggest<string> {
	private nutrientCache: NutrientCache;
	private foodTag: string;
	private nutritionKeywords = ["kcal", "fat", "prot", "carbs", "sugar"];

	// Precompiled regex patterns for performance
	private foodTagRegex: RegExp;
	private nutritionQueryRegex: RegExp;
	private nutritionValidationRegex: RegExp;

	constructor(app: App, foodTag: string, nutrientCache: NutrientCache) {
		super(app);
		this.foodTag = foodTag;
		this.nutrientCache = nutrientCache;

		this.updateFoodTagRegex();
		this.nutritionQueryRegex = /.*\s+(\d+[a-z]*)$/;
		this.nutritionValidationRegex = /^\d+[a-z]*$/;
	}

	updateFoodTag(foodTag: string): void {
		this.foodTag = foodTag;
		this.updateFoodTagRegex();
	}

	private updateFoodTagRegex(): void {
		const escapedFoodTag = this.foodTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
		this.foodTagRegex = new RegExp(`#${escapedFoodTag}\\s+(.*)$`);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);

		// Early exit if cursor is at beginning of line
		if (cursor.ch === 0) return null;

		// Check if line contains food tag using precompiled regex
		if (!this.foodTagRegex.test(line.substring(0, cursor.ch))) return null;

		// Use substring only when necessary and match with precompiled regex
		const beforeCursor = line.substring(0, cursor.ch);
		const foodMatch = this.foodTagRegex.exec(beforeCursor);
		if (!foodMatch) return null;

		const query = foodMatch[1] || "";

		// Check if we're in the context of typing nutritional values
		const nutritionMatch = this.nutritionQueryRegex.exec(query);
		if (nutritionMatch) {
			const nutritionQuery = nutritionMatch[1];
			// Only trigger nutrition suggestions if we have a number followed by letters
			if (this.nutritionValidationRegex.test(nutritionQuery)) {
				return {
					start: { line: cursor.line, ch: cursor.ch - nutritionQuery.length },
					end: cursor,
					query: nutritionQuery,
				};
			}
		}

		// Regular food name autocomplete
		return {
			start: { line: cursor.line, ch: cursor.ch - query.length },
			end: cursor,
			query: query,
		};
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		const query = context.query.toLowerCase();

		// Check if we're suggesting nutritional keywords (must start with a digit)
		if (this.nutritionValidationRegex.test(query)) {
			const matchingNutrition = this.nutritionKeywords.filter(keyword =>
				keyword.toLowerCase().startsWith(query.replace(LEADING_NUMBER_REGEX, ""))
			);

			if (matchingNutrition.length > 0) {
				// Extract the number part
				const numberMatch = LEADING_NUMBER_REGEX.exec(query);
				const numberPart = numberMatch ? numberMatch[0] : "";

				return matchingNutrition.map(keyword => numberPart + keyword);
			}
		}

		// Regular food name suggestions
		const nutrientNames = this.nutrientCache.getNutrientNames();
		if (!query) {
			return nutrientNames;
		}

		return nutrientNames.filter(name => name.toLowerCase().includes(query));
	}

	renderSuggestion(nutrient: string, el: HTMLElement): void {
		el.createEl("div", { text: nutrient });
	}

	selectSuggestion(nutrient: string, _evt: MouseEvent | KeyboardEvent): void {
		const context = this.context;
		if (!context) return;

		// Check if this is a nutrition keyword suggestion
		if (this.nutritionKeywords.some(keyword => nutrient.includes(keyword))) {
			// For nutrition keywords, replace with the suggestion and add a space
			const replacement = nutrient + " ";
			context.editor.replaceRange(replacement, context.start, context.end);

			// Move cursor to the end of the replacement
			const newCursorPos = {
				line: context.start.line,
				ch: context.start.ch + replacement.length,
			};
			context.editor.setCursor(newCursorPos);
		} else {
			// Regular food name suggestion
			const fileName = this.nutrientCache.getFileNameFromNutrientName(nutrient);
			const replacement = `[[${fileName ?? nutrient}]]`;

			// Use the start/end from the context we defined in onTrigger
			context.editor.replaceRange(replacement, context.start, context.end);

			// Move cursor to the end of the replacement
			const newCursorPos = {
				line: context.start.line,
				ch: context.start.ch + replacement.length,
			};
			context.editor.setCursor(newCursorPos);
		}
	}
}
