import StatsService from "../StatsService";
import NutritionTotal from "../NutritionTotal";
import { App, TFile } from "obsidian";
import { SettingsService, DEFAULT_SETTINGS } from "../SettingsService";
import GoalsService from "../GoalsService";
import NutrientCache from "../NutrientCache";

// Mock createEl similar to NutritionTotal tests
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

// Simple stub for goals service
const goalsService = { currentGoals: {} } as unknown as GoalsService;

// Dummy nutrient cache not used for inline entries
const dummyCache = { getNutritionData: () => null } as unknown as NutrientCache;

function createApp(contents: Record<string, string>): App {
	const app = new App();
	const files: TFile[] = Object.keys(contents).map(path => ({
		path,
		name: path,
		basename: path.replace(/\.md$/, ""),
		extension: "md",
	})) as unknown as TFile[];
	const vault = app.vault as unknown as {
		getMarkdownFiles: () => TFile[];
		read: (file: TFile) => Promise<string>;
		cachedRead?: (file: TFile) => Promise<string>;
	};
	vault.getMarkdownFiles = () => files;
	vault.read = (file: TFile) => Promise.resolve(contents[file.path]);
	vault.cachedRead = (file: TFile) => Promise.resolve(contents[file.path]);
	return app;
}

describe("StatsService", () => {
	test("aggregates daily totals for a month", async () => {
		const contents = {
			"2024-08-01.md": "#food Apple 100kcal 10prot",
			"2024-08-03.md": "#food Banana 200kcal 20prot",
		};
		const app = createApp(contents);
		const settings = new SettingsService();
		settings.initialize(DEFAULT_SETTINGS);
		const nutritionTotal = new NutritionTotal(dummyCache);
		const service = new StatsService(app, nutritionTotal, settings, goalsService);

		const stats = await service.getMonthlyStats(2024, 8);
		expect(stats.length).toBe(31);

		const firstDay = stats.find(s => s.date === "2024-08-01");
		expect(firstDay?.element?.querySelector('[data-food-tracker-tooltip*="Calories: 100"]')).not.toBeNull();

		const missingDay = stats.find(s => s.date === "2024-08-02");
		expect(missingDay?.element).toBeNull();
	});
});
