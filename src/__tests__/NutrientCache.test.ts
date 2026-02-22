import NutrientCache from "../NutrientCache";
import { App, TFile, CachedMetadata } from "obsidian";

function createFile(path: string): TFile {
	return {
		path,
		name: path.split("/").pop() ?? path,
		basename: (path.split("/").pop() ?? path).replace(/\.md$/, ""),
		extension: "md",
	} as unknown as TFile;
}

type FrontmatterMap = Record<string, CachedMetadata | null>;

function createApp(frontmatterMap: FrontmatterMap, files: TFile[]): App {
	const app = new App();

	const vault = app.vault as unknown as {
		getMarkdownFiles: () => TFile[];
	};
	vault.getMarkdownFiles = () => files;

	const metadataCache = app.metadataCache as unknown as {
		getFileCache: (file: TFile) => CachedMetadata | null;
	};
	metadataCache.getFileCache = (file: TFile) => frontmatterMap[file.path] ?? null;

	return app;
}

describe("NutrientCache", () => {
	test("keeps nutrient entry when metadata is temporarily unavailable on modify", () => {
		const file = createFile("nutrients/apple.md");

		const frontmatterMap: FrontmatterMap = {
			[file.path]: { frontmatter: { name: "apple" } } as unknown as CachedMetadata,
		};

		const app = createApp(frontmatterMap, [file]);
		const cache = new NutrientCache(app, "nutrients");

		cache.initialize();
		expect(cache.getNutrientNames()).toEqual(["apple"]);

		// Simulate modify event firing before metadata cache is ready
		frontmatterMap[file.path] = null;
		cache.updateCache(file, "modify");

		// Entry should remain until metadata becomes available again
		expect(cache.getNutrientNames()).toEqual(["apple"]);

		// Metadata becomes available after parsing finishes
		frontmatterMap[file.path] = { frontmatter: { name: "apple", calories: 10 } } as unknown as CachedMetadata;
		cache.updateCache(file, "modify");

		expect(cache.getNutrientNames()).toEqual(["apple"]);
		expect(cache.getNutritionData("apple")?.calories).toBe(10);
	});

	test("reads nutrition_per from frontmatter", () => {
		const file = createFile("nutrients/cookie.md");
		const frontmatterMap: FrontmatterMap = {
			[file.path]: {
				frontmatter: {
					name: "cookie",
					calories: 150,
					nutrition_per: 28,
					serving_size: 28,
				},
			} as unknown as CachedMetadata,
		};
		const app = createApp(frontmatterMap, [file]);
		const cache = new NutrientCache(app, "nutrients");

		cache.initialize();

		expect(cache.getNutritionData("cookie")?.nutrition_per).toBe(28);
		expect(cache.getNutritionData("cookie")?.serving_size).toBe(28);
		expect(cache.getNutritionData("cookie")?.calories).toBe(150);
	});
});
