import { App, TFile, AbstractInputSuggest } from "obsidian";

export default class FileSuggest extends AbstractInputSuggest<TFile> {
	constructor(
		private appInstance: App,
		private inputEl: HTMLInputElement
	) {
		super(appInstance, inputEl);
	}

	getSuggestions(query: string): TFile[] {
		return this.appInstance.vault
			.getMarkdownFiles()
			.filter(file => file.path.toLowerCase().includes(query.toLowerCase()));
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger("input");
	}
}
