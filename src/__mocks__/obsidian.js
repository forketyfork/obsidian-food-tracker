// Mock for Obsidian API
module.exports = {
	Component: class Component {
		addChild() {}
		removeChild() {}
		onload() {}
		onunload() {}
		load() {}
		unload() {}
		register() {}
		registerEvent() {}
	},
	Plugin: class Plugin {
		constructor(app, manifest) {
			this.app = app;
			this.manifest = manifest;
			this._children = [];
		}
		loadData() {
			return Promise.resolve({});
		}
		saveData() {
			return Promise.resolve();
		}
		addSettingTab() {}
		addCommand() {}
		addRibbonIcon() {
			return {};
		}
		addChild(child) {
			this._children.push(child);
			if (typeof child.onload === "function") child.onload();
		}
		removeChild(child) {
			this._children = this._children.filter(c => c !== child);
			if (typeof child.onunload === "function") child.onunload();
		}
		registerEvent() {}
		registerEditorSuggest() {}
		registerMarkdownPostProcessor() {}
		registerEditorExtension() {}
		addStatusBarItem() {
			return {
				setText: () => {},
			};
		}
	},
	PluginSettingTab: class PluginSettingTab {
		constructor() {}
	},
	Setting: class Setting {
		constructor() {
			return {
				setName: () => this,
				setDesc: () => this,
				addText: () => this,
				addToggle: () => this,
				addExtraButton: () => this,
			};
		}
	},
	Modal: class Modal {
		constructor() {}
		open() {}
		close() {}
	},
	App: class App {
		constructor() {
			this.vault = {
				adapter: {
					exists: () => Promise.resolve(true),
					read: () => Promise.resolve(""),
				},
				createFolder: () => Promise.resolve(),
				create: () => Promise.resolve(),
				read: () => Promise.resolve(""),
				getAbstractFileByPath: () => null,
				getMarkdownFiles: () => [],
				on: () => ({}),
			};
			this.metadataCache = {
				getFileCache: () => null,
				on: () => ({}),
			};
			this.workspace = {
				getLeaf: () => ({
					openFile: () => Promise.resolve(),
				}),
				getActiveViewOfType: () => null,
				on: () => ({}),
				onLayoutReady: callback => {
					// Call callback immediately in test environment
					if (typeof callback === "function") {
						setTimeout(callback, 0);
					}
				},
			};
		}
	},
	TextComponent: class TextComponent {
		constructor() {
			this.inputEl = {
				focus: () => {},
				select: () => {},
				addEventListener: () => {},
			};
			return {
				setPlaceholder: () => this,
				setValue: () => this,
				onChange: () => this,
				inputEl: this.inputEl,
			};
		}
	},
	TFile: class TFile {},
	TFolder: class TFolder {},
	MarkdownView: class MarkdownView {},
	StatusBarItem: class StatusBarItem {
		setText() {}
	},
	EditorSuggest: class EditorSuggest {
		constructor(app) {
			this.app = app;
		}
		onTrigger() {
			return null;
		}
		getSuggestions() {
			return [];
		}
		renderSuggestion() {}
		selectSuggestion() {}
	},
	AbstractInputSuggest: class AbstractInputSuggest {
		constructor(app, inputEl) {
			this.app = app;
			this.inputEl = inputEl;
		}
		getSuggestions() {
			return [];
		}
		renderSuggestion() {}
		selectSuggestion() {}
	},
	getFrontMatterInfo: () => ({ exists: false }),
	normalizePath: path => path,
	requestUrl: () =>
		Promise.resolve({
			status: 200,
			json: {},
		}),
	addIcon: () => {},
	setIcon: () => {},
};
