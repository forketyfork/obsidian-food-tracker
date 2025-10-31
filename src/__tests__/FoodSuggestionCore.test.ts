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

		test("should not show suggestions for workout tag without numbers", () => {
			const result = core.analyzeTrigger("#workout training", 17);
			expect(result).toBeNull();
		});

		test("should treat latest workout tag in mixed line as workout context", () => {
			const line = "#food Banana 120kcal #workout Running 200";
			const trigger = core.analyzeTrigger(line, line.length);

			expect(trigger).toEqual({
				query: "200",
				startOffset: line.length - 3,
				endOffset: line.length,
				context: "nutrition",
				tagType: "workout",
			});

			const suggestions = core.getSuggestions(trigger!.query, provider, trigger!.context, trigger!.tagType);
			expect(suggestions).toEqual(["200kcal"]);
		});

		test("should react to workout tag updates", async () => {
			settingsService.updateWorkoutTag("exercise");
			// Give some time for the observable to update
			await new Promise(resolve => setTimeout(resolve, 0));
			const result = core.analyzeTrigger("#exercise cardio 300", 20);
			expect(result).not.toBeNull();
			expect(result?.query).toBe("300");
			expect(result?.tagType).toBe("workout");
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
				tagType: "food",
			});
		});

		test("should trigger for empty food query", () => {
			const result = core.analyzeTrigger("#food ", 6);
			expect(result).toEqual({
				query: "",
				startOffset: 6,
				endOffset: 6,
				tagType: "food",
			});
		});

		test("should trigger for partial food query", () => {
			const result = core.analyzeTrigger("#food app", 9);
			expect(result).toEqual({
				query: "app",
				startOffset: 6,
				endOffset: 9,
				tagType: "food",
			});
		});

		test("should trigger nutrition suggestions for valid nutrition query", () => {
			const result = core.analyzeTrigger("#food apple 100k", 16);
			expect(result).toEqual({
				query: "100k",
				startOffset: 12,
				endOffset: 16,
				context: "nutrition",
				tagType: "food",
			});
		});

		test("should trigger nutrition suggestions for number only", () => {
			const result = core.analyzeTrigger("#food apple 100", 15);
			expect(result).toEqual({
				query: "100",
				startOffset: 12,
				endOffset: 15,
				context: "nutrition",
				tagType: "food",
			});
		});

		test("should not trigger nutrition suggestions for invalid nutrition query", () => {
			const result = core.analyzeTrigger("#food apple text", 16);
			expect(result).toEqual({
				query: "apple text",
				startOffset: 6,
				endOffset: 16,
				tagType: "food",
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
				tagType: "food",
			});
		});

		test("should handle food tag with multiple words", () => {
			const result = core.analyzeTrigger("#food multiple word query", 25);
			expect(result).toEqual({
				query: "multiple word query",
				startOffset: 6,
				endOffset: 25,
				tagType: "food",
			});
		});

		test("should trigger measure suggestions for food wikilink with number", () => {
			const result = core.analyzeTrigger("#food [[Dried_cranberries]] 123", 32);
			expect(result).toEqual({
				query: "123",
				startOffset: 29,
				endOffset: 32,
				context: "measure",
				tagType: "food",
			});
		});

		test("should trigger measure suggestions for food wikilink with number and letter", () => {
			const result = core.analyzeTrigger("#food [[Dried_cranberries]] 123g", 33);
			expect(result).toEqual({
				query: "123g",
				startOffset: 29,
				endOffset: 33,
				context: "measure",
				tagType: "food",
			});
		});

		test("should trigger nutrition suggestions for negative numbers", () => {
			const result = core.analyzeTrigger("#food workout -100", 18);
			expect(result).toEqual({
				query: "-100",
				startOffset: 14,
				endOffset: 18,
				context: "nutrition",
				tagType: "food",
			});
		});

		test("should trigger nutrition suggestions for negative numbers with letters", () => {
			const result = core.analyzeTrigger("#food workout -100k", 19);
			expect(result).toEqual({
				query: "-100k",
				startOffset: 14,
				endOffset: 19,
				context: "nutrition",
				tagType: "food",
			});
		});

		test("should trigger suggestions with workout tag", () => {
			const result = core.analyzeTrigger("#workout training 300", 21);
			expect(result).toEqual({
				query: "300",
				startOffset: 18,
				endOffset: 21,
				context: "nutrition",
				tagType: "workout",
			});
		});

		test("should trigger suggestions with workout tag and partial keyword", () => {
			const result = core.analyzeTrigger("#workout training 300k", 22);
			expect(result).toEqual({
				query: "300k",
				startOffset: 18,
				endOffset: 22,
				context: "nutrition",
				tagType: "workout",
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
			expect(suggestions).toEqual([
				"100kcal",
				"100fat",
				"100satfat",
				"100prot",
				"100carbs",
				"100sugar",
				"100fiber",
				"100sodium",
			]);
		});

		test("should return partial nutrition keyword matches", () => {
			const suggestions = core.getSuggestions("100c", provider);
			expect(suggestions).toEqual(["100carbs"]);
		});

		test("should return satfat suggestions for partial query", () => {
			const suggestions = core.getSuggestions("7sat", provider);
			expect(suggestions).toEqual(["7satfat"]);
		});

		test("should return satfat in suggestions list", () => {
			const suggestions = core.getSuggestions("100s", provider);
			expect(suggestions).toContain("100satfat");
			expect(suggestions).toContain("100sugar");
			expect(suggestions).toContain("100sodium");
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
			expect(suggestions).toEqual([
				"100g",
				"100ml",
				"100kg",
				"100l",
				"100oz",
				"100lb",
				"100cup",
				"100tbsp",
				"100tsp",
				"100pc",
			]);
		});

		test("should return measure suggestions for partial measure queries", () => {
			const suggestions = core.getSuggestions("100g", provider, "measure");
			expect(suggestions).toEqual(["100g"]);
		});

		test("should return nutrition suggestions for number queries in nutrition context", () => {
			const suggestions = core.getSuggestions("100", provider, "nutrition");
			expect(suggestions).toEqual([
				"100kcal",
				"100fat",
				"100satfat",
				"100prot",
				"100carbs",
				"100sugar",
				"100fiber",
				"100sodium",
			]);
		});

		test("should return only kcal suggestion for negative number queries", () => {
			const suggestions = core.getSuggestions("-100", provider);
			expect(suggestions).toEqual(["-100kcal"]);
		});

		test("should return only kcal suggestion for negative number with partial keyword", () => {
			const suggestions = core.getSuggestions("-100k", provider);
			expect(suggestions).toEqual(["-100kcal"]);
		});

		test("should return empty array for negative numbers with non-kcal keywords", () => {
			const suggestions = core.getSuggestions("-100f", provider);
			expect(suggestions).toEqual([]);
		});

		test("should return empty array for negative numbers in measure context", () => {
			const suggestions = core.getSuggestions("-100", provider, "measure");
			expect(suggestions).toEqual([]);
		});

		test("should return only kcal suggestion for workout tag", () => {
			const suggestions = core.getSuggestions("300", provider, "nutrition", "workout");
			expect(suggestions).toEqual(["300kcal"]);
		});

		test("should return only kcal suggestion for workout tag with partial keyword", () => {
			const suggestions = core.getSuggestions("300k", provider, "nutrition", "workout");
			expect(suggestions).toEqual(["300kcal"]);
		});

		test("should not return non-kcal suggestions for workout tag", () => {
			const suggestions = core.getSuggestions("300p", provider, "nutrition", "workout");
			expect(suggestions).toEqual([]);
		});

		test("should not support negative kcal for workout tag", () => {
			const suggestions = core.getSuggestions("-100", provider, "nutrition", "workout");
			expect(suggestions).toEqual([]);
		});

		test("should not support negative kcal with partial keyword for workout tag", () => {
			const suggestions = core.getSuggestions("-100k", provider, "nutrition", "workout");
			expect(suggestions).toEqual([]);
		});

		test("should not suggest zero calories for workout tag", () => {
			expect(core.getSuggestions("0", provider, "nutrition", "workout")).toEqual([]);
			expect(core.getSuggestions("0k", provider, "nutrition", "workout")).toEqual([]);
			expect(core.getSuggestions("0kcal", provider, undefined, "workout")).toEqual([]);
		});
	});

	describe("isNutritionKeyword", () => {
		test("should identify nutrition keywords", () => {
			expect(core.isNutritionKeyword("100kcal")).toBe(true);
			expect(core.isNutritionKeyword("50fat")).toBe(true);
			expect(core.isNutritionKeyword("7satfat")).toBe(true);
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
			expect(core.isNutritionKeyword("2pc")).toBe(true);
		});

		test("should not identify regular food names as nutrition keywords", () => {
			expect(core.isNutritionKeyword("apple")).toBe(false);
			expect(core.isNutritionKeyword("banana")).toBe(false);
			expect(core.isNutritionKeyword("chicken breast")).toBe(false);
		});

		test("should identify negative kcal keywords only", () => {
			expect(core.isNutritionKeyword("-100kcal")).toBe(true);
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

		test("should handle workout tag workflow with only kcal suggestions", () => {
			// User types "#workout running"
			let trigger = core.analyzeTrigger("#workout running", 16);
			expect(trigger).toBeNull(); // No suggestions for food names with workout tag

			// User types "#workout running 300"
			trigger = core.analyzeTrigger("#workout running 300", 20);
			expect(trigger?.query).toBe("300");
			expect(trigger?.context).toBe("nutrition");
			expect(trigger?.tagType).toBe("workout");

			// Get suggestions - should only return kcal
			let suggestions = core.getSuggestions("300", provider, trigger?.context, trigger?.tagType);
			expect(suggestions).toEqual(["300kcal"]);

			// User types "#workout running 300k"
			trigger = core.analyzeTrigger("#workout running 300k", 21);
			expect(trigger?.query).toBe("300k");

			suggestions = core.getSuggestions("300k", provider, trigger?.context, trigger?.tagType);
			expect(suggestions).toEqual(["300kcal"]);

			// Generate replacement
			const replacement = core.getNutritionKeywordReplacement("300kcal");
			expect(replacement).toBe("300kcal ");
		});
	});
});
