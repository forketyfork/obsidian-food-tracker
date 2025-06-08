import FoodTrackerPlugin from "../main";
import { App, PluginManifest } from "obsidian";

describe("FoodTrackerPlugin", () => {
	let plugin: FoodTrackerPlugin;

	beforeEach(async () => {
		plugin = new FoodTrackerPlugin({} as App, {} as PluginManifest);
		await plugin.onload();
	});

	test("plugin loads with default settings", async () => {
		await plugin.loadSettings();

		expect(plugin.settings).toBeDefined();
		expect(plugin.settings.hello).toBe("world");
	});
});
