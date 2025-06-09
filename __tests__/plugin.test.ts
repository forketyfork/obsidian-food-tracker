import FoodTrackerPlugin from "../main";
import { App, PluginManifest } from "obsidian";

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

	test("highlightFoodAmount wraps value", () => {
		const el = document.createElement("p");
		el.textContent = "#food [[apple]] 50g";

		plugin.highlightFoodAmount(el);

		expect(el.innerHTML).toBe('#food [[apple]] <span class="food-value">50g</span>');
	});
});
