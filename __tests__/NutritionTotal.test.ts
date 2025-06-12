import NutritionTotal from "../NutritionTotal";
import NutrientCache from "../NutrientCache";

describe("NutritionTotal", () => {
	let nutritionTotal: NutritionTotal;
	let mockGetNutritionData: jest.Mock;

	beforeEach(() => {
		mockGetNutritionData = jest.fn();
		const mockNutrientCache = {
			getNutritionData: mockGetNutritionData,
		} as unknown as NutrientCache;

		nutritionTotal = new NutritionTotal(mockNutrientCache);
		jest.clearAllMocks();
	});

	describe("calculateTotalNutrients", () => {
		test("returns empty string for content with no food entries", () => {
			const content = "This is just regular text with no food entries.";
			const result = nutritionTotal.calculateTotalNutrients(content);
			expect(result).toBe("");
		});

		test("works with custom food tag", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
				fats: 10,
			});

			const content = "#meal [[apple]] 200g";
			const result = nutritionTotal.calculateTotalNutrients(content, "meal");

			expect(mockGetNutritionData).toHaveBeenCalledWith("apple");
			expect(result).toBe("📊 Daily total: 🔥 200 kcal, 🥑 Fats: 20.0g");
		});

		test("works with custom food tag for inline nutrition", () => {
			const content = "#nutrition Cordon Bleu with salad 300kcal 20fat 10prot 30carbs 3sugar";
			const result = nutritionTotal.calculateTotalNutrients(content, "nutrition");

			expect(result).toBe(
				"📊 Daily total: 🔥 300 kcal, 🥑 Fats: 20.0g, 🥩 Protein: 10.0g, 🍞 Carbs: 30.0g, 🍯 Sugar: 3.0g"
			);
		});

		test("returns empty string for empty content", () => {
			const result = nutritionTotal.calculateTotalNutrients("");
			expect(result).toBe("");
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
			expect(result).toBe(
				"📊 Daily total: 🔥 200 kcal, 🥑 Fats: 20.0g, 🥩 Protein: 40.0g, 🍞 Carbs: 30.0g, 🌾 Fiber: 10.0g, 🍯 Sugar: 6.0g, 🧂 Sodium: 400.0mg"
			);
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
			expect(result).toBe(
				"📊 Daily total: 🔥 400 kcal, 🥑 Fats: 10.0g, 🥩 Protein: 20.0g, 🍞 Carbs: 45.0g, 🌾 Fiber: 7.5g"
			);
		});

		test("handles missing nutrient data gracefully", () => {
			mockGetNutritionData.mockReturnValue(null);

			const content = "#food [[unknown-food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("");
		});

		test("handles cache errors gracefully", () => {
			mockGetNutritionData.mockImplementation(() => {
				throw new Error("Cache error");
			});

			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			const content = "#food [[error-food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("");
			expect(consoleSpy).toHaveBeenCalledWith("Error reading nutrient data for error-food:", "Cache error");

			consoleSpy.mockRestore();
		});

		test("supports different units - grams", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 200g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 200 kcal");
		});

		test("supports different units - kilograms", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1.5kg";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 1500 kcal");
		});

		test("supports different units - milliliters", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 250ml";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 250 kcal");
		});

		test("supports different units - liters", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1l";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 1000 kcal");
		});

		test("supports different units - ounces", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1oz";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 28 kcal");
		});

		test("supports different units - pounds", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1lb";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 454 kcal");
		});

		test("supports different units - cups (proper volume conversion)", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content1 = "#food [[food]] 1cup";
			const result1 = nutritionTotal.calculateTotalNutrients(content1);
			expect(result1).toBe("📊 Daily total: 🔥 240 kcal"); // 1 cup = 240ml ≈ 240g, so 240/100 * 100 = 240

			const content2 = "#food [[food]] 2cups";
			const result2 = nutritionTotal.calculateTotalNutrients(content2);
			expect(result2).toBe("📊 Daily total: 🔥 480 kcal"); // 2 cups = 480g, so 480/100 * 100 = 480
		});

		test("supports different units - tablespoons and teaspoons (proper volume conversion)", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content1 = "#food [[food]] 1tbsp";
			const result1 = nutritionTotal.calculateTotalNutrients(content1);
			expect(result1).toBe("📊 Daily total: 🔥 15 kcal"); // 1 tbsp = 15ml ≈ 15g, so 15/100 * 100 = 15

			const content2 = "#food [[food]] 1tsp";
			const result2 = nutritionTotal.calculateTotalNutrients(content2);
			expect(result2).toBe("📊 Daily total: 🔥 5 kcal"); // 1 tsp = 5ml ≈ 5g, so 5/100 * 100 = 5
		});

		test("handles decimal amounts", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 123.45g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 123 kcal");
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
			expect(result).toBe("📊 Daily total: 🔥 100 kcal");
		});

		test("is case insensitive for units", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 100G";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 100 kcal");
		});

		test("formats calories as rounded integers", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 123.7,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 124 kcal");
		});

		test("formats other nutrients to 1 decimal place", () => {
			mockGetNutritionData.mockReturnValue({
				fats: 12.456,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🥑 Fats: 12.5g");
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

			expect(result).toBe("📊 Daily total: 🔥 100 kcal, 🍞 Carbs: 20.0g");
		});

		test("returns empty string when no nutrients have values", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 0,
				fats: 0,
				protein: 0,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("");
		});

		test("handles partial nutrient data", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 150,
				protein: 10.5,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 150 kcal, 🥩 Protein: 10.5g");
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
			expect(result).toBe("📊 Daily total: 🔥 249 kcal, 🍞 Carbs: 65.1g, 🌾 Fiber: 9.6g, 🍯 Sugar: 42.9g");
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
			expect(result).toBe("📊 Daily total: 🔥 350 kcal, 🥑 Fats: 35.0g, 🥩 Protein: 17.5g");
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

			expect(result).toBe(
				"📊 Daily total: 🔥 251 kcal, 🥑 Fats: 15.2g, 🥩 Protein: 20.8g, 🍞 Carbs: 30.1g, 🌾 Fiber: 5.6g, 🍯 Sugar: 8.3g, 🧂 Sodium: 123.9mg"
			);
		});

		test("calculates total nutrients for inline nutrition entries", () => {
			const content = "#food Cordon Bleu with salad 300kcal 20fat 10prot 30carbs 3sugar";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe(
				"📊 Daily total: 🔥 300 kcal, 🥑 Fats: 20.0g, 🥩 Protein: 10.0g, 🍞 Carbs: 30.0g, 🍯 Sugar: 3.0g"
			);
		});

		test("calculates total nutrients for multiple inline nutrition entries", () => {
			const content = `#food Breakfast sandwich 250kcal 15fat 12prot 20carbs
#food Lunch salad 180kcal 8fat 5prot 25carbs 2sugar`;
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe(
				"📊 Daily total: 🔥 430 kcal, 🥑 Fats: 23.0g, 🥩 Protein: 17.0g, 🍞 Carbs: 45.0g, 🍯 Sugar: 2.0g"
			);
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
			expect(result).toBe("📊 Daily total: 🔥 350 kcal, 🥑 Fats: 15.5g, 🥩 Protein: 27.0g, 🍞 Carbs: 38.0g");
		});

		test("handles partial inline nutrition data", () => {
			const content = "#food Snack 120kcal 5fat";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 120 kcal, 🥑 Fats: 5.0g");
		});

		test("handles decimal values in inline nutrition", () => {
			const content = "#food Light meal 150.5kcal 7.2fat 8.8prot 15.3carbs";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily total: 🔥 151 kcal, 🥑 Fats: 7.2g, 🥩 Protein: 8.8g, 🍞 Carbs: 15.3g");
		});

		test("ignores inline nutrition if food name starts with [[", () => {
			const content = "#food [[apple]] 300kcal 20fat 10prot";
			const result = nutritionTotal.calculateTotalNutrients(content);

			// Should not match inline pattern since it starts with [[
			expect(result).toBe("");
		});

		test("handles complex food names in inline nutrition", () => {
			const content = "#food Chicken Caesar Salad with Dressing 450kcal 35fat 25prot 15carbs 2sugar";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe(
				"📊 Daily total: 🔥 450 kcal, 🥑 Fats: 35.0g, 🥩 Protein: 25.0g, 🍞 Carbs: 15.0g, 🍯 Sugar: 2.0g"
			);
		});

		test("is case insensitive for inline nutrition keywords", () => {
			const content = "#food Test meal 200KCAL 10FAT 15PROT 20CARBS 5SUGAR";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe(
				"📊 Daily total: 🔥 200 kcal, 🥑 Fats: 10.0g, 🥩 Protein: 15.0g, 🍞 Carbs: 20.0g, 🍯 Sugar: 5.0g"
			);
		});

		test("handles mixed order of inline nutrition values", () => {
			const content = "#food Mixed order 15prot 200kcal 5sugar 10fat 25carbs";
			const result = nutritionTotal.calculateTotalNutrients(content);

			expect(result).toBe(
				"📊 Daily total: 🔥 200 kcal, 🥑 Fats: 10.0g, 🥩 Protein: 15.0g, 🍞 Carbs: 25.0g, 🍯 Sugar: 5.0g"
			);
		});

		test("adds progress bar with green color when within 10% of goal", () => {
			const goals = { fats: 50 };
			mockGetNutritionData.mockReturnValue({ fats: 45 });
			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content, "food", false, goals);
			expect(result).toContain("ft-progress-green");
			expect(result).toContain("--ft-progress-percent:90%");
		});

		test("adds progress bar with yellow color when below 90% of goal", () => {
			const goals = { protein: 100 };
			mockGetNutritionData.mockReturnValue({ protein: 50 });
			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content, "food", false, goals);
			expect(result).toContain("ft-progress-yellow");
			expect(result).toContain("--ft-progress-percent:50%");
		});

		test("adds progress bar with red color when exceeding goal", () => {
			const goals = { carbs: 30 };
			mockGetNutritionData.mockReturnValue({ carbs: 45 });
			const content = "#food [[food]] 100g";
			const result = nutritionTotal.calculateTotalNutrients(content, "food", false, goals);
			expect(result).toContain("ft-progress-red");
			expect(result).toContain("--ft-progress-percent:100%");
		});
	});
});
