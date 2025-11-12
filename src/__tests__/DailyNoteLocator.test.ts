import DailyNoteLocator from "../DailyNoteLocator";
import { SettingsService, DEFAULT_SETTINGS } from "../SettingsService";
import { TFile } from "obsidian";

function createFile(path: string): TFile {
	return {
		path,
		name: path.split("/").pop() ?? path,
		basename: (path.split("/").pop() ?? path).replace(/\.md$/, ""),
		extension: "md",
	} as unknown as TFile;
}

describe("DailyNoteLocator", () => {
	let settings: SettingsService;

	beforeEach(() => {
		settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
	});

	test("parses weekday format correctly", () => {
		settings.updateDailyNoteFormat("dddd YYYY-MM-DD");
		const locator = new DailyNoteLocator(settings);
		const file = createFile("Wednesday 2025-11-12.md");

		const match = locator.match(file);

		expect(match).not.toBeNull();
		expect(match?.key).toBe("2025-11-12");
	});

	test("rejects invalid weekday", () => {
		settings.updateDailyNoteFormat("dddd YYYY-MM-DD");
		const locator = new DailyNoteLocator(settings);
		const file = createFile("Monday 2025-11-12.md");

		const match = locator.match(file);

		expect(match).toBeNull();
	});

	test("handles literal text in brackets", () => {
		settings.updateDailyNoteFormat("YYYY-MM-DD-[journal]");
		const locator = new DailyNoteLocator(settings);

		expect(locator.match(createFile("2025-11-12-journal.md"))).not.toBeNull();
		expect(locator.match(createFile("2025-11-12.md"))).toBeNull();
	});
});
