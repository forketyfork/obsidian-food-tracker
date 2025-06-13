import { FoodSuggestionCore, NutrientProvider } from "../FoodSuggestionCore";
import { SettingsService, DEFAULT_SETTINGS } from "../SettingsService";

// Mock implementation of NutrientProvider for testing
class MockNutrientProvider implements NutrientProvider {
	private nutrients = ["apple", "banana", "chicken breast", "rice", "milk"];
	private fileMap = new Map([
		["apple", "apple-nutrition"],
		["banana", "banana-nutrition"],
		["chicken breast", "chicken-breast-nutrition"],
		["rice", "rice-nutrition"],
		["milk", "milk-nutrition"],
	]);

	getNutrientNames(): string[] {
		return [...this.nutrients];
	}

	getFileNameFromNutrientName(nutrientName: string): string | null {
		return this.fileMap.get(nutrientName) ?? null;
	}
}

describe("FoodSuggestionCore", () => {
	let core: FoodSuggestionCore;
	let provider: MockNutrientProvider;
	let settingsService: SettingsService;

	beforeEach(() => {
		settingsService = new SettingsService();
		settingsService.initialize(DEFAULT_SETTINGS);
		core = new FoodSuggestionCore(settingsService);
		provider = new MockNutrientProvider();
	});

	afterEach(() => {
		core.destroy();
	});

	describe("constructor and food tag updates", () => {
		test("should initialize with food tag", () => {
			expect(core).toBeInstanceOf(FoodSuggestionCore);
		});

		test("should react to food tag updates", async () => {
			settingsService.updateFoodTag("nutrition");
			// Give some time for the observable to update
			await new Promise(resolve => setTimeout(resolve, 0));
			const result = core.analyzeTrigger("#nutrition apple", 16);
			expect(result).not.toBeNull();
			expect(result?.query).toBe("apple");
		});
	});

	describe("analyzeTrigger", () => {
		test("should return null for cursor at beginning of line", () => {
			const result = core.analyzeTrigger("#food apple", 0);
			expect(result).toBeNull();
		});

		test("should return null for line without food tag", () => {
			const result = core.analyzeTrigger("regular text apple", 10);
			expect(result).toBeNull();
		});

		test("should trigger for basic food query", () => {
			const result = core.analyzeTrigger("#food apple", 11);
			expect(result).toEqual({
				query: "apple",
				startOffset: 6,
				endOffset: 11,
			});
		});

		test("should trigger for empty food query", () => {
			const result = core.analyzeTrigger("#food ", 6);
			expect(result).toEqual({
				query: "",
				startOffset: 6,
				endOffset: 6,
			});
		});

		test("should trigger for partial food query", () => {
			const result = core.analyzeTrigger("#food app", 9);
			expect(result).toEqual({
				query: "app",
				startOffset: 6,
				endOffset: 9,
			});
		});

		test("should trigger nutrition suggestions for valid nutrition query", () => {
			const result = core.analyzeTrigger("#food apple 100k", 16);
			expect(result).toEqual({
				query: "100k",
				startOffset: 12,
				endOffset: 16,
				context: "nutrition",
			});
		});

		test("should trigger nutrition suggestions for number only", () => {
			const result = core.analyzeTrigger("#food apple 100", 15);
			expect(result).toEqual({
				query: "100",
				startOffset: 12,
				endOffset: 15,
				context: "nutrition",
			});
		});

		test("should not trigger nutrition suggestions for invalid nutrition query", () => {
			const result = core.analyzeTrigger("#food apple text", 16);
			expect(result).toEqual({
				query: "apple text",
				startOffset: 6,
				endOffset: 16,
			});
		});

		test("should handle special characters in food tag", async () => {
			settingsService.updateFoodTag("food+tag");
			// Give some time for the observable to update
			await new Promise(resolve => setTimeout(resolve, 0));
			const result = core.analyzeTrigger("#food+tag apple", 15);
			expect(result).toEqual({
				query: "apple",
				startOffset: 10,
				endOffset: 15,
			});
		});

		test("should handle food tag with multiple words", () => {
			const result = core.analyzeTrigger("#food multiple word query", 25);
			expect(result).toEqual({
				query: "multiple word query",
				startOffset: 6,
				endOffset: 25,
			});
		});

		test("should trigger measure suggestions for food wikilink with number", () => {
			const result = core.analyzeTrigger("#food [[Dried_cranberries]] 123", 32);
			expect(result).toEqual({
				query: "123",
				startOffset: 29,
				endOffset: 32,
				context: "measure",
			});
		});

		test("should trigger measure suggestions for food wikilink with number and letter", () => {
			const result = core.analyzeTrigger("#food [[Dried_cranberries]] 123g", 33);
			expect(result).toEqual({
				query: "123g",
				startOffset: 29,
				endOffset: 33,
				context: "measure",
			});
		});
	});

	describe("getSuggestions", () => {
		test("should return all nutrients for empty query", () => {
			const suggestions = core.getSuggestions("", provider);
			expect(suggestions).toEqual(["apple", "banana", "chicken breast", "rice", "milk"]);
		});

		test("should filter nutrients by query", () => {
			const suggestions = core.getSuggestions("app", provider);
			expect(suggestions).toEqual(["apple"]);
		});

		test("should be case insensitive", () => {
			const suggestions = core.getSuggestions("APP", provider);
			expect(suggestions).toEqual(["apple"]);
		});

		test("should return nutrition keywords for number queries", () => {
			const suggestions = core.getSuggestions("100k", provider);
			expect(suggestions).toEqual(["100kcal"]);
		});

		test("should return multiple nutrition keywords", () => {
			const suggestions = core.getSuggestions("100", provider);
			expect(suggestions).toEqual(["100kcal", "100fat", "100prot", "100carbs", "100sugar", "100fiber", "100sodium"]);
		});

		test("should return partial nutrition keyword matches", () => {
			const suggestions = core.getSuggestions("100c", provider);
			expect(suggestions).toEqual(["100carbs"]);
		});

		test("should return empty array for nutrition query with no matches", () => {
			const suggestions = core.getSuggestions("100xyz", provider);
			expect(suggestions).toEqual([]);
		});

		test("should filter by partial food names", () => {
			const suggestions = core.getSuggestions("ch", provider);
			expect(suggestions).toEqual(["chicken breast"]);
		});

		test("should return measure suggestions for number queries in measure context", () => {
			const suggestions = core.getSuggestions("100", provider, "measure");
			expect(suggestions).toEqual(["100g", "100ml", "100kg", "100l", "100oz", "100lb", "100cup", "100tbsp", "100tsp"]);
		});

		test("should return measure suggestions for partial measure queries", () => {
			const suggestions = core.getSuggestions("100g", provider, "measure");
			expect(suggestions).toEqual(["100g"]);
		});

		test("should return nutrition suggestions for number queries in nutrition context", () => {
			const suggestions = core.getSuggestions("100", provider, "nutrition");
			expect(suggestions).toEqual(["100kcal", "100fat", "100prot", "100carbs", "100sugar", "100fiber", "100sodium"]);
		});
	});

	describe("isNutritionKeyword", () => {
		test("should identify nutrition keywords", () => {
			expect(core.isNutritionKeyword("100kcal")).toBe(true);
			expect(core.isNutritionKeyword("50fat")).toBe(true);
			expect(core.isNutritionKeyword("25prot")).toBe(true);
			expect(core.isNutritionKeyword("30carbs")).toBe(true);
			expect(core.isNutritionKeyword("15sugar")).toBe(true);
		});

		test("should identify measure keywords", () => {
			expect(core.isNutritionKeyword("100g")).toBe(true);
			expect(core.isNutritionKeyword("50ml")).toBe(true);
			expect(core.isNutritionKeyword("25kg")).toBe(true);
			expect(core.isNutritionKeyword("30l")).toBe(true);
			expect(core.isNutritionKeyword("15oz")).toBe(true);
		});

		test("should not identify regular food names as nutrition keywords", () => {
			expect(core.isNutritionKeyword("apple")).toBe(false);
			expect(core.isNutritionKeyword("banana")).toBe(false);
			expect(core.isNutritionKeyword("chicken breast")).toBe(false);
		});
	});

	describe("getFoodNameReplacement", () => {
		test("should return wikilink with file name when available", () => {
			const replacement = core.getFoodNameReplacement("apple", provider);
			expect(replacement).toBe("[[apple-nutrition]]");
		});

		test("should return wikilink with nutrient name when file name not available", () => {
			const replacement = core.getFoodNameReplacement("unknown food", provider);
			expect(replacement).toBe("[[unknown food]]");
		});
	});

	describe("getNutritionKeywordReplacement", () => {
		test("should return nutrition keyword with trailing space", () => {
			const replacement = core.getNutritionKeywordReplacement("100kcal");
			expect(replacement).toBe("100kcal ");
		});

		test("should handle different nutrition keywords", () => {
			expect(core.getNutritionKeywordReplacement("50fat")).toBe("50fat ");
			expect(core.getNutritionKeywordReplacement("25prot")).toBe("25prot ");
		});
	});

	describe("integration scenarios", () => {
		test("should handle complete food entry workflow", () => {
			// User types "#food app"
			let trigger = core.analyzeTrigger("#food app", 9);
			expect(trigger?.query).toBe("app");

			// Get suggestions for "app"
			let suggestions = core.getSuggestions("app", provider);
			expect(suggestions).toEqual(["apple"]);

			// User selects "apple" and continues typing
			trigger = core.analyzeTrigger("#food apple 100", 15);
			expect(trigger?.query).toBe("100");

			// Get nutrition suggestions
			suggestions = core.getSuggestions("100", provider, trigger?.context);
			expect(suggestions).toContain("100kcal");

			// Generate replacement for nutrition
			const replacement = core.getNutritionKeywordReplacement("100kcal");
			expect(replacement).toBe("100kcal ");
		});

		test("should handle nutrition query with partial keyword", () => {
			const trigger = core.analyzeTrigger("#food apple 100k", 16);
			expect(trigger?.query).toBe("100k");

			const suggestions = core.getSuggestions("100k", provider, trigger?.context);
			expect(suggestions).toEqual(["100kcal"]);
		});

		test("should handle measure suggestions for food wikilink workflow", () => {
			// User types "#food [[Dried_cranberries]] 123"
			const trigger = core.analyzeTrigger("#food [[Dried_cranberries]] 123", 32);
			expect(trigger?.query).toBe("123");
			expect(trigger?.context).toBe("measure");

			// Get measure suggestions for "123"
			const suggestions = core.getSuggestions("123", provider, trigger?.context);
			expect(suggestions).toContain("123g");
			expect(suggestions).toContain("123ml");

			// Generate replacement for measure
			const replacement = core.getNutritionKeywordReplacement("123g");
			expect(replacement).toBe("123g ");
		});
	});
});
