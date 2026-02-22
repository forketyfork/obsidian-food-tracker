// Mock for Obsidian API
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TOKEN_REGEX = /(\[[^\]]*\]|YYYY|MM|DD|dddd|.)/g;

function escapeRegExp(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFormatTokens(format) {
	return format.match(TOKEN_REGEX) ?? [];
}

function parseWithFormat(input, format) {
	const tokens = buildFormatTokens(format);
	let pattern = "^";
	let groupIndex = 1;
	let yearGroup = null;
	let monthGroup = null;
	let dayGroup = null;
	let weekdayGroup = null;

	for (const token of tokens) {
		switch (token) {
			case "YYYY":
				pattern += "(\\d{4})";
				yearGroup = groupIndex++;
				break;
			case "MM":
				pattern += "(\\d{2})";
				monthGroup = groupIndex++;
				break;
			case "DD":
				pattern += "(\\d{2})";
				dayGroup = groupIndex++;
				break;
			case "dddd":
				pattern += "([A-Za-z]+)";
				weekdayGroup = groupIndex++;
				break;
			default:
				if (token.startsWith("[") && token.endsWith("]")) {
					pattern += escapeRegExp(token.slice(1, -1));
				} else {
					pattern += escapeRegExp(token);
				}
				break;
		}
	}

	pattern += "$";

	const regex = new RegExp(pattern);
	const match = regex.exec(input);
	if (!match || yearGroup === null || monthGroup === null || dayGroup === null) {
		return null;
	}

	const year = Number(match[yearGroup]);
	const month = Number(match[monthGroup]);
	const day = Number(match[dayGroup]);

	if (
		Number.isNaN(year) ||
		Number.isNaN(month) ||
		Number.isNaN(day) ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31
	) {
		return null;
	}

	const date = new Date(year, month - 1, day);

	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}

	if (weekdayGroup !== null) {
		const expected = DAY_NAMES[date.getDay()].toLowerCase();
		const provided = match[weekdayGroup].toLowerCase();
		if (expected !== provided) {
			return null;
		}
	}

	return date;
}

function formatDate(date, format) {
	const tokens = buildFormatTokens(format);
	return tokens
		.map(token => {
			switch (token) {
				case "YYYY":
					return date.getFullYear().toString().padStart(4, "0");
				case "MM":
					return (date.getMonth() + 1).toString().padStart(2, "0");
				case "DD":
					return date.getDate().toString().padStart(2, "0");
				case "dddd":
					return DAY_NAMES[date.getDay()];
				default:
					if (token.startsWith("[") && token.endsWith("]")) {
						return token.slice(1, -1);
					}
					return token;
			}
		})
		.join("");
}

function createMoment(input, format, strict) {
	let date;
	let isValid = false;

	if (typeof format === "string") {
		const candidate = typeof input === "string" ? input : "";
		const parsed = parseWithFormat(candidate, format);
		if (parsed) {
			date = parsed;
			isValid = true;
		} else if (!strict) {
			const fallback = new Date(candidate);
			if (!Number.isNaN(fallback.getTime())) {
				date = fallback;
				isValid = true;
			}
		}

		if (!date) {
			date = new Date(NaN);
		}
	} else if (input instanceof Date) {
		date = new Date(input.getTime());
		isValid = !Number.isNaN(date.getTime());
	} else if (typeof input === "string" && input) {
		const parsed = new Date(input);
		if (!Number.isNaN(parsed.getTime())) {
			date = parsed;
			isValid = true;
		} else {
			date = new Date(NaN);
		}
	} else {
		date = new Date();
		isValid = true;
	}

	return {
		_date: date,
		_isValid: Boolean(isValid),
		isValid() {
			return this._isValid;
		},
		format(fmt = "YYYY-MM-DDTHH:mm:ss[Z]") {
			if (!this.isValid()) {
				return "Invalid date";
			}
			return formatDate(this._date, fmt);
		},
		toDate() {
			return new Date(this._date.getTime());
		},
	};
}

module.exports = {
	moment: createMoment,
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
			this.fileManager = {
				processFrontMatter: () => Promise.resolve(),
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
	Notice: class Notice {
		constructor(_message, _timeout) {}
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
	Platform: {
		isMobile: false,
		isDesktop: true,
		isDesktopApp: true,
		isMobileApp: false,
		isIosApp: false,
		isAndroidApp: false,
		isPhone: false,
		isTablet: false,
		isMacOS: false,
		isWin: false,
		isLinux: false,
		isSafari: false,
		resourcePathPrefix: "",
	},
};
