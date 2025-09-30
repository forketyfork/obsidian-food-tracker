import { App, TFolder, AbstractInputSuggest } from "obsidian";

export default class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(
		private appInstance: App,
		private inputEl: HTMLInputElement
	) {
		super(appInstance, inputEl);
	}

	getSuggestions(query: string): TFolder[] {
		return this.appInstance.vault
			.getAllFolders()
			.filter(folder => folder.path.toLowerCase().includes(query.toLowerCase()));
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path || "/");
	}

	selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.path;
		this.inputEl.trigger("input");
	}
}
