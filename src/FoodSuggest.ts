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
	private currentFile?: TFile;

	constructor(app: App, settingsService: SettingsService, nutrientCache: NutrientCache) {
		super(app);
		this.nutrientCache = nutrientCache;
		this.settingsService = settingsService;
		this.suggestionCore = new FoodSuggestionCore(settingsService);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const trigger = this.suggestionCore.analyzeTrigger(line, cursor.ch);

		if (!trigger) return null;

		// Store the context, tag type, and file for use in getSuggestions and selectSuggestion
		this.currentContext = trigger.context;
		this.currentTagType = trigger.tagType;
		this.currentFile = file;

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
		} else if (this.settingsService.currentLinkType === "markdown" && this.currentFile) {
			replacement = this.getFullMarkdownLink(nutrient);
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

	/**
	 * Generates a full markdown link for a nutrient
	 * Constructs a complete markdown link with display text and relative path
	 */
	private getFullMarkdownLink(nutrientName: string): string {
		const fileName = this.nutrientCache.getFileNameFromNutrientName(nutrientName);
		if (!fileName || !this.currentFile) {
			return `[${nutrientName}]()`;
		}

		// Get the nutrient directory
		const nutrientDir = this.settingsService.currentNutrientDirectory;

		// Construct the full path to the nutrient file
		const nutrientPath = `${nutrientDir}/${fileName}`;

		// Calculate relative path from current file to nutrient file
		const currentDir = this.currentFile.parent?.path ?? "";
		const relativePath = this.calculateRelativePath(currentDir, nutrientPath);

		// URL encode the path components (but not the slashes)
		const encodedPath = relativePath
			.split("/")
			.map(part => encodeURIComponent(part))
			.join("/");

		return `[${nutrientName}](${encodedPath}.md)`;
	}

	/**
	 * Calculates a relative path from one directory to a file
	 */
	private calculateRelativePath(fromDir: string, toPath: string): string {
		const fromParts = fromDir ? fromDir.split("/") : [];
		const toParts = toPath.split("/");

		// Find common prefix
		let commonLength = 0;
		while (
			commonLength < fromParts.length &&
			commonLength < toParts.length &&
			fromParts[commonLength] === toParts[commonLength]
		) {
			commonLength++;
		}

		// Build relative path with ../ for each level up
		const upLevels = fromParts.length - commonLength;
		const upPath = upLevels > 0 ? Array(upLevels).fill("..").join("/") + "/" : "";

		// Add the remaining path parts
		const remainingPath = toParts.slice(commonLength).join("/");

		return upPath + remainingPath;
	}
}
