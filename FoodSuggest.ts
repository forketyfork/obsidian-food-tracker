import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from "obsidian";
import FoodTrackerPlugin from "./FoodTrackerPlugin";

export default class FoodSuggest extends EditorSuggest<string> {
	plugin: FoodTrackerPlugin;
	private nutritionKeywords = ["kcal", "fat", "prot", "carbs", "sugar"];

	constructor(plugin: FoodTrackerPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.substring(0, cursor.ch);

		// Check if we have "#food " followed by any text
		const foodMatch = beforeCursor.match(/#food\s+(.*)$/);
		if (foodMatch) {
			const query = foodMatch[1] || "";

			// Check if we're in the context of typing nutritional values (after some text with numbers)
			const nutritionMatch = query.match(/.*\s+(\d+[a-z]*)$/);
			if (nutritionMatch) {
				const nutritionQuery = nutritionMatch[1];
				// Only trigger nutrition suggestions if we have a number followed by letters
				if (/^\d+[a-z]*$/.test(nutritionQuery)) {
					return {
						start: { line: cursor.line, ch: cursor.ch - nutritionQuery.length },
						end: cursor,
						query: nutritionQuery,
					};
				}
			}

			// Regular food name autocomplete
			return {
				start: { line: cursor.line, ch: cursor.ch - query.length }, // Start after "#food "
				end: cursor,
				query: query,
			};
		}
		return null;
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		const query = context.query.toLowerCase();

		// Check if we're suggesting nutritional keywords (must start with a digit)
		if (/^\d+[a-z]*$/.test(query)) {
			const matchingNutrition = this.nutritionKeywords.filter(keyword =>
				keyword.toLowerCase().startsWith(query.replace(/^\d+/, ""))
			);

			if (matchingNutrition.length > 0) {
				// Extract the number part
				const numberMatch = query.match(/^(\d+)/);
				const numberPart = numberMatch ? numberMatch[1] : "";

				return matchingNutrition.map(keyword => numberPart + keyword);
			}
		}

		// Regular food name suggestions
		const nutrientNames = this.plugin.getNutrientNames();
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
			const fileName = this.plugin.getFileNameFromNutrientName(nutrient);
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
