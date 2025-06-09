import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from "obsidian";
import FoodTrackerPlugin from "./FoodTrackerPlugin";

export default class FoodSuggest extends EditorSuggest<string> {
       plugin: FoodTrackerPlugin;
       private tagRegex: RegExp;

       constructor(plugin: FoodTrackerPlugin) {
               super(plugin.app);
               this.plugin = plugin;
               this.updateTagRegex(this.plugin.settings.foodTag);
       }

       updateTagRegex(tag: string): void {
               const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
               this.tagRegex = new RegExp(`${escapedTag}\\s+(.*)$`);
       }

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.substring(0, cursor.ch);

               // Check if we have the configured tag followed by any text
               const match = beforeCursor.match(this.tagRegex);
		if (match) {
			const query = match[1] || "";
			return {
				start: { line: cursor.line, ch: cursor.ch - query.length }, // Start after the tag
				end: cursor,
				query: query,
			};
		}
		return null;
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		const nutrientNames = this.plugin.getNutrientNames();
		const query = context.query.toLowerCase();

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

		// Get the filename for the selected nutrient
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
