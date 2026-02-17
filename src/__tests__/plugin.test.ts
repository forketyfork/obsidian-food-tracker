import FoodTrackerPlugin from "../main";
import { App, PluginManifest } from "obsidian";
import { DEFAULT_SETTINGS } from "../SettingsService";

describe("FoodTrackerPlugin", () => {
	let plugin: FoodTrackerPlugin;

	beforeEach(async () => {
		plugin = new FoodTrackerPlugin(new App(), {} as PluginManifest);
		await plugin.onload();
	});

	test("plugin loads with default settings", async () => {
		await plugin.loadSettings();

		expect(plugin.settings).toBeDefined();
		expect(plugin.settings.nutrientDirectory).toBe("nutrients");
	});

	test("loadSettings handles null from loadData (fresh install)", async () => {
		plugin.loadData = () => Promise.resolve(null);

		await plugin.loadSettings();

		expect(plugin.settings).toBeDefined();
		expect(plugin.settings.nutrientDirectory).toBe(DEFAULT_SETTINGS.nutrientDirectory);
		expect(plugin.settings.frontmatterFieldNames).toEqual(DEFAULT_SETTINGS.frontmatterFieldNames);
	});
});
