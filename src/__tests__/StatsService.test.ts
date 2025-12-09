import StatsService from "../StatsService";
import NutritionTotal from "../NutritionTotal";
import { App, TFile, CachedMetadata } from "obsidian";
import { SettingsService, DEFAULT_SETTINGS } from "../SettingsService";
import GoalsService from "../GoalsService";
import NutrientCache from "../NutrientCache";

function createEl<T extends keyof HTMLElementTagNameMap>(
	tag: T,
	options?: { text?: string; cls?: string | string[] }
): HTMLElementTagNameMap[T] {
	const element = document.createElement(tag);
	if (options?.text) element.textContent = options.text;
	if (options?.cls) {
		if (Array.isArray(options.cls)) {
			element.classList.add(...options.cls);
		} else {
			element.classList.add(options.cls);
		}
	}
	return element;
}

const g = global as unknown as {
	createEl: typeof createEl;
	document: Document & { createElementNS: (namespace: string, tag: string) => Element };
};
g.createEl = jest.fn().mockImplementation(createEl);
g.document.createElementNS = jest
	.fn()
	.mockImplementation((_namespace: string, tag: string) => document.createElement(tag));

const goalsService = { currentGoals: {} } as unknown as GoalsService;

const dummyCache = { getNutritionData: () => null } as unknown as NutrientCache;

interface FrontmatterData {
	"ft.calories"?: number;
	"ft.fats"?: number;
	"ft.protein"?: number;
	"ft.carbs"?: number;
	"ft.fiber"?: number;
	"ft.sugar"?: number;
	"ft.sodium"?: number;
	"ft.saturated_fats"?: number;
}

interface AppTestConfig {
	frontmatterMap: Record<string, FrontmatterData | null>;
	contentMap?: Record<string, string>;
}

function createApp(config: AppTestConfig): App {
	const { frontmatterMap, contentMap = {} } = config;
	const app = new App();
	const files: TFile[] = Object.keys(frontmatterMap).map(path => ({
		path,
		name: path.split("/").pop() ?? path,
		basename: (path.split("/").pop() ?? path).replace(/\.md$/, ""),
		extension: "md",
	})) as unknown as TFile[];

	const vault = app.vault as unknown as {
		getMarkdownFiles: () => TFile[];
		cachedRead: (file: TFile) => Promise<string>;
	};
	vault.getMarkdownFiles = () => files;
	vault.cachedRead = (file: TFile) => Promise.resolve(contentMap[file.path] ?? "");

	const metadataCache = app.metadataCache as unknown as {
		getFileCache: (file: TFile) => CachedMetadata | null;
	};
	metadataCache.getFileCache = (file: TFile) => {
		const frontmatter = frontmatterMap[file.path];
		if (frontmatter === null) {
			return null;
		}
		return { frontmatter } as unknown as CachedMetadata;
	};

	const fileManager = app.fileManager as unknown as {
		processFrontMatter: (file: TFile, fn: (frontmatter: Record<string, unknown>) => void) => Promise<void>;
	};
	fileManager.processFrontMatter = async (_file: TFile, _fn: (frontmatter: Record<string, unknown>) => void) => {
		// Mock implementation - in tests we don't actually write to files
	};

	return app;
}

describe("StatsService", () => {
	test("aggregates daily totals from frontmatter for a month", async () => {
		const frontmatterMap = {
			"2024-08-01.md": { "ft.calories": 100, "ft.protein": 10 },
			"2024-08-03.md": { "ft.calories": 200, "ft.protein": 20 },
		};
		const app = createApp({ frontmatterMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);
		expect(stats.length).toBe(31);

		const firstDay = stats.find(s => s.date === "2024-08-01");
		expect(firstDay?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 100"]')).not.toBeNull();

		const thirdDay = stats.find(s => s.date === "2024-08-03");
		expect(thirdDay?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 200"]')).not.toBeNull();

		const missingDay = stats.find(s => s.date === "2024-08-02");
		expect(missingDay?.element).toBeNull();
	});

	test("supports custom filename formats", async () => {
		const frontmatterMap = {
			"2024.08.01.md": { "ft.calories": 120 },
		};
		const app = createApp({ frontmatterMap });
		const settings = new SettingsService();
		settings.initialize({
			...DEFAULT_SETTINGS,
			dailyNoteFormat: "YYYY.MM.DD",
		});
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);
		const dayStat = stats.find(s => s.date === "2024-08-01");
		expect(dayStat?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 120"]')).not.toBeNull();
	});

	test("combines frontmatter totals from multiple files for the same day", async () => {
		const frontmatterMap = {
			"journal/2024-08-01.md": { "ft.calories": 100 },
			"archive/2024-08-01.md": { "ft.calories": 120 },
		};
		const app = createApp({ frontmatterMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);
		const dayStat = stats.find(s => s.date === "2024-08-01");
		expect(dayStat?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 220"]')).not.toBeNull();
	});

	test("falls back to parsing content when frontmatter is missing", async () => {
		const frontmatterMap: Record<string, FrontmatterData | null> = {
			"2024-08-01.md": null,
		};
		const contentMap = {
			"2024-08-01.md": "#food Breakfast 300kcal 20prot",
		};
		const app = createApp({ frontmatterMap, contentMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);

		const day1 = stats.find(s => s.date === "2024-08-01");
		expect(day1?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 300"]')).not.toBeNull();
		expect(day1?.element?.querySelector('[data-food-tracker-tooltip*="Protein: 20"]')).not.toBeNull();
	});

	test("returns null element for files without frontmatter totals and no food entries", async () => {
		const frontmatterMap: Record<string, FrontmatterData | null> = {
			"2024-08-01.md": null,
			"2024-08-02.md": {},
		};
		const contentMap = {
			"2024-08-01.md": "Just a regular note with no food entries",
			"2024-08-02.md": "Another regular note",
		};
		const app = createApp({ frontmatterMap, contentMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);

		const day1 = stats.find(s => s.date === "2024-08-01");
		expect(day1?.element).toBeNull();

		const day2 = stats.find(s => s.date === "2024-08-02");
		expect(day2?.element).toBeNull();
	});

	test("ignores non-matching files without logging warnings", async () => {
		const frontmatterMap = {
			"YouTrack/RDO-3716.md": { "ft.calories": 100 },
			"2024-08-05.md": { "ft.calories": 90 },
		};
		const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		const app = createApp({ frontmatterMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		await service.getMonthlyStats(2024, 8);

		expect(consoleSpy).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	test("maintains backward compatibility with date-prefixed files", async () => {
		const frontmatterMap = {
			"2024-08-01-journal.md": { "ft.calories": 100 },
			"2024-08-02-notes.md": { "ft.calories": 150 },
			"2024-08-03.md": { "ft.calories": 80 },
		};
		const app = createApp({ frontmatterMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);

		const day1 = stats.find(s => s.date === "2024-08-01");
		const day2 = stats.find(s => s.date === "2024-08-02");
		const day3 = stats.find(s => s.date === "2024-08-03");

		expect(day1?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 100"]')).not.toBeNull();
		expect(day2?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 150"]')).not.toBeNull();
		expect(day3?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 80"]')).not.toBeNull();
	});

	test("aggregates multiple nutrients correctly", async () => {
		const frontmatterMap = {
			"2024-08-01.md": {
				"ft.calories": 500,
				"ft.fats": 20.5,
				"ft.protein": 30,
				"ft.carbs": 60,
			},
		};
		const app = createApp({ frontmatterMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);
		const dayStat = stats.find(s => s.date === "2024-08-01");

		expect(dayStat?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 500"]')).not.toBeNull();
		expect(dayStat?.element?.querySelector('[data-food-tracker-tooltip*="Fats: 20.5"]')).not.toBeNull();
		expect(dayStat?.element?.querySelector('[data-food-tracker-tooltip*="Protein: 30"]')).not.toBeNull();
		expect(dayStat?.element?.querySelector('[data-food-tracker-tooltip*="Carbs: 60"]')).not.toBeNull();
	});

	test("combines frontmatter and backfilled data for same day", async () => {
		const frontmatterMap: Record<string, FrontmatterData | null> = {
			"journal/2024-08-01.md": { "ft.calories": 100 },
			"archive/2024-08-01.md": null,
		};
		const contentMap = {
			"journal/2024-08-01.md": "",
			"archive/2024-08-01.md": "#food Dinner 200kcal",
		};
		const app = createApp({ frontmatterMap, contentMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);
		const dayStat = stats.find(s => s.date === "2024-08-01");
		expect(dayStat?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 300"]')).not.toBeNull();
	});

	test("shows zero calories for workout-only days that net to zero", async () => {
		const frontmatterMap = {
			"2024-08-01.md": { "ft.calories": 0 },
		};
		const app = createApp({ frontmatterMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);
		const dayStat = stats.find(s => s.date === "2024-08-01");
		expect(dayStat?.element).not.toBeNull();
		expect(dayStat?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 0"]')).not.toBeNull();
	});

	test("backfills workout-only day with zero calories", async () => {
		const frontmatterMap: Record<string, FrontmatterData | null> = {
			"2024-08-01.md": null,
		};
		const contentMap = {
			"2024-08-01.md": "#food Lunch 300kcal\n#workout Running 300kcal",
		};
		const app = createApp({ frontmatterMap, contentMap });
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService, dummyCache);

		const stats = await service.getMonthlyStats(2024, 8);
		const dayStat = stats.find(s => s.date === "2024-08-01");
		expect(dayStat?.element).not.toBeNull();
		expect(dayStat?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 0"]')).not.toBeNull();
	});
});
