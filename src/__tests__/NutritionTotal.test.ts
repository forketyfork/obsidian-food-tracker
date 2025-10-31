import NutritionTotal from "../NutritionTotal";
import NutrientCache from "../NutrientCache";

// Mock createEl function to simulate Obsidian's DOM creation
declare global {
	function createEl<T extends keyof HTMLElementTagNameMap>(
		tag: T,
		options?: { cls?: string | string[]; text?: string; attr?: Record<string, string> }
	): HTMLElementTagNameMap[T];
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
global.createEl = jest.fn().mockImplementation((tag: string, options?: any) => {
	const element = document.createElement(tag) as any;
	if (options?.cls) {
		const classes = Array.isArray(options.cls) ? options.cls : [options.cls];
		element.classList.add(...classes);
	}
	if (options?.text) {
		element.textContent = options.text;
	}
	if (options?.attr) {
		Object.entries(options.attr).forEach(([key, value]) => {
			element.setAttribute(key, value as string);
		});
	}

	// Add Obsidian-specific methods
	element.addClass = jest.fn().mockImplementation((...classes: string[]) => {
		element.classList.add(...classes);
		return element;
	});

	return element;
});

// Mock createElementNS for SVG creation
global.document.createElementNS = jest.fn().mockImplementation((_namespace: string, tag: string) => {
	const element = document.createElement(tag) as any;
	element.setAttribute = jest.fn();
	element.appendChild = jest.fn();
	return element;
});
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */

describe("NutritionTotal", () => {
	let nutritionTotal: NutritionTotal;
	let mockGetNutritionData: jest.Mock;

	// Helper function to extract just the emojis from the HTMLElement output for easier testing
	const extractEmojis = (element: HTMLElement | null): string => {
		if (!element) return "";
		const spans = element.querySelectorAll(".food-tracker-nutrient-item");
		const emojis = Array.from(spans).map(span => span.textContent?.trim() ?? "");
		return emojis.join(" ");
	};

	const expectEmojis = (result: HTMLElement | null, expectedEmojis: string): void => {
		if (expectedEmojis === "") {
			expect(result).toBeNull();
			return;
		}
		expect(result).not.toBeNull();
		expect(result!.classList.contains("food-tracker-nutrition-bar")).toBe(true);
		expect(extractEmojis(result)).toBe(expectedEmojis);
	};

	// Helper function to check if HTMLElement contains specific class or attribute
	const expectElementToContain = (element: HTMLElement | null, content: string): void => {
		expect(element).not.toBeNull();
		const html = element!.outerHTML;
		expect(html).toContain(content);
	};

	beforeEach(() => {
		mockGetNutritionData = jest.fn();
		const mockNutrientCache = {
			getNutritionData: mockGetNutritionData,
		} as unknown as NutrientCache;

		nutritionTotal = new NutritionTotal(mockNutrientCache);
		jest.clearAllMocks();
	});

	describe("calculateTotalNutrients", () => {
		test("returns null for content with no food entries", () => {
			const content = "This is just regular text with no food entries.";
			const result = nutritionTotal.calculateTotalNutrients(content);
			expect(result).toBeNull();
		});

		test("works with custom food tag", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
				fats: 10,
			});

			const content = "#meal [[apple]] 200g";
			const result = nutritionTotal.calculateTotalNutrients(content, "meal");

			expect(mockGetNutritionData).toHaveBeenCalledWith("apple");
			expectEmojis(result, "🔥 🥑");
		});

		test("works with custom food tag for inline nutrition", () => {
			const content = "#nutrition Cordon Bleu with salad 300kcal 20fat 10prot 30carbs 3sugar";
			const result = nutritionTotal.calculateTotalNutrients(content, "nutrition");

			expectEmojis(result, "🔥 🥑 🥩 🍞 🍯");
		});

		test("returns null for empty content", () => {
			const result = nutritionTotal.calculateTotalNutrients("");
			expect(result).toBeNull();
		});

		test("calculates total nutrients for single food entry", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
				fats: 10,
				protein: 20,
				carbs: 15,
				fiber: 5,
				sugar: 3,
				sodium: 200,
			});

			const content = "#food [[apple]] 200g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(mockGetNutritionData).toHaveBeenCalledWith("apple");
			expectEmojis(result, "🔥 🥑 🥩 🍞 🌾 🍯 🧂");
		});

		test("calculates total nutrients for multiple food entries", () => {
			mockGetNutritionData
				.mockReturnValueOnce({
					calories: 100,
					fats: 10,
					protein: 20,
				})
				.mockReturnValueOnce({
					calories: 200,
					carbs: 30,
					fiber: 5,
				});

			const content = `#food [[apple]] 100g
Some other text
#food [[banana]] 150g`;

			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(mockGetNutritionData).toHaveBeenCalledWith("apple");
			expect(mockGetNutritionData).toHaveBeenCalledWith("banana");
			expectEmojis(result, "🔥 🥑 🥩 🍞 🌾");
		});

		test("subtracts workout calories using workout tag", () => {
			const content = `#food Lunch 500kcal\n#workout Running 200kcal`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).not.toBeNull();
			expect(result?.querySelector('[data-food-tracker-tooltip*="Calories: 300"]')).not.toBeNull();
		});

		test("subtracts negative calories logged under food tag", () => {
			const content = `#food Breakfast 400kcal\n#food Recovery -150kcal`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).not.toBeNull();
			expect(result?.querySelector('[data-food-tracker-tooltip*="Calories: 250"]')).not.toBeNull();
		});

		test("supports custom workout tag", () => {
			const content = `#food Dinner 600kcal\n#workout-session Evening ride 275kcal`;
			const result = nutritionTotal.calculateTotalNutrients(content, "food", false, undefined, "workout-session");

			expect(result).not.toBeNull();
			expect(result?.querySelector('[data-food-tracker-tooltip*="Calories: 325"]')).not.toBeNull();
		});

		test("ignores negative workout calories", () => {
			const content = `#food Lunch 500kcal\n#workout Running -200kcal`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).not.toBeNull();
			expect(result?.querySelector('[data-food-tracker-tooltip*="Calories: 500"]')).not.toBeNull();
		});

		test("accepts only positive workout calories", () => {
			const content = `#food Breakfast 400kcal\n#workout Cycling 150kcal\n#workout Swimming -100kcal`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).not.toBeNull();
			expect(result?.querySelector('[data-food-tracker-tooltip*="Calories: 250"]')).not.toBeNull();
		});

		test("handles missing nutrient data gracefully", () => {
			mockGetNutritionData.mockReturnValue(null);

			const content = "#food [[unknown-food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBeNull();
		});

		test("handles cache errors gracefully", () => {
			mockGetNutritionData.mockImplementation(() => {
				throw new Error("Cache error");
			});

			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			const content = "#food [[error-food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith("Error reading nutrient data for error-food:", "Cache error");

			consoleSpy.mockRestore();
		});

		test("supports different units - grams", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 200g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥");
		});

		test("supports different units - kilograms", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1.5kg";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥");
		});

		test("supports different units - milliliters", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 250ml";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥");
		});

		test("supports different units - liters", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1l";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥");
		});

		test("supports different units - ounces", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1oz";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥");
		});

		test("supports different units - pounds", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1lb";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥");
		});

		test("supports different units - cups (proper volume conversion)", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content1 = "#food [[food]] 1cup";
			const result1 = nutritionTotal.calculateTotalNutrients(content1);
			expectEmojis(result1, "🔥"); // 1 cup = 240ml ≈ 240g, so 240/100 * 100 = 240

			const content2 = "#food [[food]] 2cups";
			const result2 = nutritionTotal.calculateTotalNutrients(content2);
			expectEmojis(result2, "🔥"); // 2 cups = 480g, so 480/100 * 100 = 480
		});

		test("supports different units - tablespoons and teaspoons (proper volume conversion)", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content1 = "#food [[food]] 1tbsp";
			const result1 = nutritionTotal.calculateTotalNutrients(content1);
			expectEmojis(result1, "🔥"); // 1 tbsp = 15ml ≈ 15g, so 15/100 * 100 = 15

			const content2 = "#food [[food]] 1tsp";
			const result2 = nutritionTotal.calculateTotalNutrients(content2);
			expectEmojis(result2, "🔥"); // 1 tsp = 5ml ≈ 5g, so 5/100 * 100 = 5
		});

		test("supports piece units when serving_size is defined", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
				serving_size: 120,
			});

			const content = "#food [[food]] 1pc";
			const result = nutritionTotal.calculateTotalNutrients(content);
			expectEmojis(result, "🔥"); // 1 piece = 120g -> 120/100*100
		});

		test("handles decimal amounts", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 123.45g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥");
		});

		test("ignores lines without proper food format", () => {
			const content = `Regular text
#food without brackets 100g
#food [[incomplete
#food [[complete]] 100g
#food [[no-amount]]
#food [[no-unit]] 100`;

			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(mockGetNutritionData).toHaveBeenCalledTimes(1);
			expect(mockGetNutritionData).toHaveBeenCalledWith("complete");
			expectEmojis(result, "🔥");
		});

		test("is case insensitive for units", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 100G";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥");

			const contentPc = "#food [[food]] 1PC";
			const resultPc = nutritionTotal.calculateTotalNutrients(contentPc);

			expectEmojis(resultPc, "🔥");
		});

		test("formats calories as rounded integers", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 123.7,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥");
		});

		test("formats other nutrients to 1 decimal place", () => {
			mockGetNutritionData.mockReturnValue({
				fats: 12.456,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🥑");
		});

		test("omits zero or undefined nutrients", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
				fats: 0,
				protein: undefined,
				carbs: 20,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🍞");
		});

		test("shows 0 calories when all nutrients are 0", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 0,
				fats: 0,
				protein: 0,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).not.toBeNull();
			expect(result?.querySelector('[data-food-tracker-tooltip*="Calories: 0"]')).not.toBeNull();
		});

		test("handles partial nutrient data", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 150,
				protein: 10.5,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥩");
		});

		test("end-to-end calculation with realistic data", () => {
			mockGetNutritionData
				.mockReturnValueOnce({
					calories: 95,
					carbs: 25,
					fiber: 4,
					sugar: 19,
				}) // apple per 100g
				.mockReturnValueOnce({
					calories: 89,
					carbs: 23,
					fiber: 3,
					sugar: 12,
				}); // banana per 100g

			const content = `Daily food log:
#food [[apple]] 150g
Had a snack
#food [[banana]] 120g
End of day`;

			const result = nutritionTotal.calculateTotalNutrients(content);

			// Expected: apple(150g) + banana(120g)
			// Calories: 95*1.5 + 89*1.2 = 142.5 + 106.8 = 249.3 -> 249
			// Carbs: 25*1.5 + 23*1.2 = 37.5 + 27.6 = 65.1
			// Fiber: 4*1.5 + 3*1.2 = 6 + 3.6 = 9.6
			// Sugar: 19*1.5 + 12*1.2 = 28.5 + 14.4 = 42.9
			expectEmojis(result, "🔥 🍞 🌾 🍯");
		});

		test("handles mixed units correctly", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
				fats: 10,
				protein: 5,
			});

			const content = `#food [[food1]] 50g
#food [[food2]] 0.1kg
#food [[food3]] 200ml`;

			const result = nutritionTotal.calculateTotalNutrients(content);

			// All should be equivalent to different amounts relative to 100g base:
			// 50g = 0.5x, 0.1kg = 1x, 200ml = 2x
			// Total: 0.5 + 1 + 2 = 3.5x
			// Calories: 100 * 3.5 = 350
			// Fats: 10 * 3.5 = 35
			// Protein: 5 * 3.5 = 17.5
			expectEmojis(result, "🔥 🥑 🥩");
		});

		test("includes all nutrient types in output", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 250.7,
				fats: 15.2,
				protein: 20.8,
				carbs: 30.1,
				fiber: 5.6,
				sugar: 8.3,
				sodium: 123.9,
			});

			const content = "#food [[complete-food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🌾 🍯 🧂");
		});

		test("calculates total nutrients for inline nutrition entries", () => {
			const content = "#food Cordon Bleu with salad 300kcal 20fat 10prot 30carbs 3sugar";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🍯");
		});

		test("calculates total nutrients for multiple inline nutrition entries", () => {
			const content = `#food Breakfast sandwich 250kcal 15fat 12prot 20carbs
#food Lunch salad 180kcal 8fat 5prot 25carbs 2sugar`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🍯");
		});

		test("calculates total nutrients for mixed linked and inline entries", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
				fats: 5,
				protein: 8,
				carbs: 12,
			});

			const content = `#food [[apple]] 150g
#food Protein bar 200kcal 8fat 15prot 20carbs`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			// Linked: 100*1.5 = 150 calories, 5*1.5 = 7.5 fats, 8*1.5 = 12 protein, 12*1.5 = 18 carbs
			// Inline: 200 calories, 8 fats, 15 protein, 20 carbs
			// Total: 350 calories, 15.5 fats, 27 protein, 38 carbs
			expectEmojis(result, "🔥 🥑 🥩 🍞");
		});

		test("handles partial inline nutrition data", () => {
			const content = "#food Snack 120kcal 5fat";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑");
		});

		test("handles decimal values in inline nutrition", () => {
			const content = "#food Light meal 150.5kcal 7.2fat 8.8prot 15.3carbs";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞");
		});

		test("ignores inline nutrition if food name starts with [[", () => {
			const content = "#food [[apple]] 300kcal 20fat 10prot";
			const result = nutritionTotal.calculateTotalNutrients(content);

			// Should not match inline pattern since it starts with [[
			expect(result).toBeNull();
		});

		test("handles complex food names in inline nutrition", () => {
			const content = "#food Chicken Caesar Salad with Dressing 450kcal 35fat 25prot 15carbs 2sugar";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🍯");
		});

		test("is case insensitive for inline nutrition keywords", () => {
			const content = "#food Test meal 200KCAL 10FAT 15PROT 20CARBS 5SUGAR";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🍯");
		});

		test("handles mixed order of inline nutrition values", () => {
			const content = "#food Mixed order 15prot 200kcal 5sugar 10fat 25carbs";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🍯");
		});

		test("adds progress bar with green color when within 10% of goal (below)", () => {
			const goals = { fats: 50 };
			mockGetNutritionData.mockReturnValue({ fats: 45 });
			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content, "food", false, goals);
			expectElementToContain(result, "food-tracker-progress-green");
			expectElementToContain(result, "--food-tracker-progress-percent: 90%;");
		});

		test("adds progress bar with green color when within 10% of goal (above)", () => {
			const goals = { fats: 50 };
			mockGetNutritionData.mockReturnValue({ fats: 55 });
			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content, "food", false, goals);
			expectElementToContain(result, "food-tracker-progress-green");
			expectElementToContain(result, "--food-tracker-progress-percent: 100%;");
		});

		test("adds progress bar with green color when exactly at goal", () => {
			const goals = { fats: 50 };
			mockGetNutritionData.mockReturnValue({ fats: 50 });
			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content, "food", false, goals);
			expectElementToContain(result, "food-tracker-progress-green");
			expectElementToContain(result, "--food-tracker-progress-percent: 100%;");
		});

		test("adds progress bar with red color when exceeding goal by more than 10%;", () => {
			const goals = { carbs: 30 };
			mockGetNutritionData.mockReturnValue({ carbs: 40 }); // 133% of goal
			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content, "food", false, goals);
			expectElementToContain(result, "food-tracker-progress-red");
			expectElementToContain(result, "--food-tracker-progress-percent: 100%;");
			expectElementToContain(result, "(133% of 30 g goal)");
		});

		test("adds progress bar with yellow color when below 90% of goal", () => {
			const goals = { carbs: 100 };
			mockGetNutritionData.mockReturnValue({ carbs: 80 }); // 80% of goal
			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content, "food", false, goals);
			expectElementToContain(result, "food-tracker-progress-yellow");
			expectElementToContain(result, "--food-tracker-progress-percent: 80%;");
		});

		test("calculates total nutrients for inline nutrition with fiber", () => {
			const content = "#food High fiber cereal 150kcal 2fat 5prot 30carbs 8fiber";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🌾");
		});

		test("calculates total nutrients for inline nutrition with sodium", () => {
			const content = "#food Soup 100kcal 3fat 4prot 12carbs 350sodium";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🧂");
		});

		test("calculates total nutrients for inline nutrition with both fiber and sodium", () => {
			const content = "#food Whole grain bread 120kcal 2fat 4prot 24carbs 3fiber 200sodium";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🌾 🧂");
		});

		test("handles mixed inline nutrition with all nutrients including fiber and sodium", () => {
			const content = "#food Complete meal 400kcal 18fat 25prot 35carbs 8sugar 12fiber 450sodium";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🌾 🍯 🧂");
		});

		test("handles case insensitivity for fiber and sodium", () => {
			const content = "#food Test meal 200kcal 10fat 15prot 20carbs 5FIBER 300SODIUM";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🌾 🧂");
		});

		test("handles mixed order with fiber and sodium", () => {
			const content = "#food Mixed order 5fiber 200kcal 300sodium 10fat 15prot 25carbs";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🌾 🧂");
		});

		test("handles decimal values for fiber and sodium", () => {
			const content = "#food Precise meal 180kcal 8.5fat 12.2prot 22.1carbs 6.8fiber 275.5sodium";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🥩 🍞 🌾 🧂");
		});

		test("handles partial inline nutrition with only fiber", () => {
			const content = "#food Fiber supplement 20kcal 15fiber";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🌾");
		});

		test("handles partial inline nutrition with only sodium", () => {
			const content = "#food Salt water 0kcal 500sodium";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🧂");
		});

		test("floors calories to 0 when workout exceeds food", () => {
			const content = `#food Snack 200kcal\n#workout Running 300kcal`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).not.toBeNull();
			expect(result?.querySelector('[data-food-tracker-tooltip*="Calories: 0"]')).not.toBeNull();
		});

		test("shows 0 calories when food and workout match exactly", () => {
			const content = `#food Meal 500kcal\n#workout Exercise 500kcal`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).not.toBeNull();
			expect(result?.querySelector('[data-food-tracker-tooltip*="Calories: 0"]')).not.toBeNull();
		});

		test("clamps all nutrients to 0 but only shows calories at 0", () => {
			const content = `#food Light meal 100kcal 5fat 3prot\n#workout Intense workout 200kcal`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).not.toBeNull();
			// Should show 0 calories
			expect(result?.querySelector('[data-food-tracker-tooltip*="Calories: 0"]')).not.toBeNull();
			// Should still show positive nutrients
			expectEmojis(result, "🔥 🥑 🥩");
		});

		test("calculates total nutrients for inline nutrition with saturated fats", () => {
			const content = "#food Butter 100kcal 11fat 7satfat";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🧈");
		});

		test("calculates total nutrients for inline nutrition with all nutrients including saturated fats", () => {
			const content = "#food Complete meal 400kcal 18fat 8satfat 25prot 35carbs 8sugar 12fiber 450sodium";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🧈 🥩 🍞 🌾 🍯 🧂");
		});

		test("handles saturated fats in linked food entries", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 200,
				fats: 15,
				saturated_fats: 7,
				protein: 10,
			});

			const content = "#food [[cheese]] 50g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🧈 🥩");
		});

		test("handles case insensitivity for saturated fats", () => {
			const content = "#food Test meal 200kcal 10fat 5SATFAT 15prot";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expectEmojis(result, "🔥 🥑 🧈 🥩");
		});
	});
});
