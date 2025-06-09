import NutritionTally from "../NutritionTally";
import NutrientCache from "../NutrientCache";

describe("NutritionTally", () => {
	let nutritionTally: NutritionTally;
	let mockGetNutritionData: jest.Mock;

	beforeEach(() => {
		mockGetNutritionData = jest.fn();
		const mockNutrientCache = {
			getNutritionData: mockGetNutritionData,
		} as unknown as NutrientCache;

		nutritionTally = new NutritionTally(mockNutrientCache);
		jest.clearAllMocks();
	});

	describe("calculateTotalNutrients", () => {
		test("returns empty string for content with no food entries", () => {
			const content = "This is just regular text with no food entries.";
			const result = nutritionTally.calculateTotalNutrients(content);
			expect(result).toBe("");
		});

		test("returns empty string for empty content", () => {
			const result = nutritionTally.calculateTotalNutrients("");
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
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(mockGetNutritionData).toHaveBeenCalledWith("apple");
			expect(result).toBe(
				"📊 Daily tally: 🔥 200 kcal, 🥑 Fats: 20.0g, 🥩 Protein: 40.0g, 🍞 Carbs: 30.0g, 🌾 Fiber: 10.0g, 🍯 Sugar: 6.0g, 🧂 Sodium: 400.0mg"
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

			const result = nutritionTally.calculateTotalNutrients(content);

			expect(mockGetNutritionData).toHaveBeenCalledWith("apple");
			expect(mockGetNutritionData).toHaveBeenCalledWith("banana");
			expect(result).toBe(
				"📊 Daily tally: 🔥 400 kcal, 🥑 Fats: 10.0g, 🥩 Protein: 20.0g, 🍞 Carbs: 45.0g, 🌾 Fiber: 7.5g"
			);
		});

		test("handles missing nutrient data gracefully", () => {
			mockGetNutritionData.mockReturnValue(null);

			const content = "#food [[unknown-food]] 100g";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("");
		});

		test("handles cache errors gracefully", () => {
			mockGetNutritionData.mockImplementation(() => {
				throw new Error("Cache error");
			});

			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			const content = "#food [[error-food]] 100g";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("");
			expect(consoleSpy).toHaveBeenCalledWith("Error reading nutrient data for error-food:", "Cache error");

			consoleSpy.mockRestore();
		});

		test("supports different units - grams", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 200g";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 200 kcal");
		});

		test("supports different units - kilograms", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1.5kg";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 1500 kcal");
		});

		test("supports different units - milliliters", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 250ml";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 250 kcal");
		});

		test("supports different units - liters", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1l";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 1000 kcal");
		});

		test("supports different units - ounces", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1oz";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 28 kcal");
		});

		test("supports different units - pounds", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 1lb";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 454 kcal");
		});

		test("supports different units - cups (defaults to gram conversion)", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content1 = "#food [[food]] 1cup";
			const result1 = nutritionTally.calculateTotalNutrients(content1);
			expect(result1).toBe("📊 Daily tally: 🔥 1 kcal"); // 1/100 of base amount

			const content2 = "#food [[food]] 2cups";
			const result2 = nutritionTally.calculateTotalNutrients(content2);
			expect(result2).toBe("📊 Daily tally: 🔥 2 kcal"); // 2/100 of base amount
		});

		test("supports different units - tablespoons and teaspoons (defaults to gram conversion)", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content1 = "#food [[food]] 1tbsp";
			const result1 = nutritionTally.calculateTotalNutrients(content1);
			expect(result1).toBe("📊 Daily tally: 🔥 1 kcal"); // 1/100 of base amount

			const content2 = "#food [[food]] 1tsp";
			const result2 = nutritionTally.calculateTotalNutrients(content2);
			expect(result2).toBe("📊 Daily tally: 🔥 1 kcal"); // 1/100 of base amount
		});

		test("handles decimal amounts", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 123.45g";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 123 kcal");
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

			const result = nutritionTally.calculateTotalNutrients(content);

			expect(mockGetNutritionData).toHaveBeenCalledTimes(1);
			expect(mockGetNutritionData).toHaveBeenCalledWith("complete");
			expect(result).toBe("📊 Daily tally: 🔥 100 kcal");
		});

		test("is case insensitive for units", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
			});

			const content = "#food [[food]] 100G";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 100 kcal");
		});

		test("formats calories as rounded integers", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 123.7,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 124 kcal");
		});

		test("formats other nutrients to 1 decimal place", () => {
			mockGetNutritionData.mockReturnValue({
				fats: 12.456,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🥑 Fats: 12.5g");
		});

		test("omits zero or undefined nutrients", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 100,
				fats: 0,
				protein: undefined,
				carbs: 20,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 100 kcal, 🍞 Carbs: 20.0g");
		});

		test("returns empty string when no nutrients have values", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 0,
				fats: 0,
				protein: 0,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("");
		});

		test("handles partial nutrient data", () => {
			mockGetNutritionData.mockReturnValue({
				calories: 150,
				protein: 10.5,
			});

			const content = "#food [[food]] 100g";
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe("📊 Daily tally: 🔥 150 kcal, 🥩 Protein: 10.5g");
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

			const result = nutritionTally.calculateTotalNutrients(content);

			// Expected: apple(150g) + banana(120g)
			// Calories: 95*1.5 + 89*1.2 = 142.5 + 106.8 = 249.3 -> 249
			// Carbs: 25*1.5 + 23*1.2 = 37.5 + 27.6 = 65.1
			// Fiber: 4*1.5 + 3*1.2 = 6 + 3.6 = 9.6
			// Sugar: 19*1.5 + 12*1.2 = 28.5 + 14.4 = 42.9
			expect(result).toBe("📊 Daily tally: 🔥 249 kcal, 🍞 Carbs: 65.1g, 🌾 Fiber: 9.6g, 🍯 Sugar: 42.9g");
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

			const result = nutritionTally.calculateTotalNutrients(content);

			// All should be equivalent to different amounts relative to 100g base:
			// 50g = 0.5x, 0.1kg = 1x, 200ml = 2x
			// Total: 0.5 + 1 + 2 = 3.5x
			// Calories: 100 * 3.5 = 350
			// Fats: 10 * 3.5 = 35
			// Protein: 5 * 3.5 = 17.5
			expect(result).toBe("📊 Daily tally: 🔥 350 kcal, 🥑 Fats: 35.0g, 🥩 Protein: 17.5g");
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
			const result = nutritionTally.calculateTotalNutrients(content);

			expect(result).toBe(
				"📊 Daily tally: 🔥 251 kcal, 🥑 Fats: 15.2g, 🥩 Protein: 20.8g, 🍞 Carbs: 30.1g, 🌾 Fiber: 5.6g, 🍯 Sugar: 8.3g, 🧂 Sodium: 123.9mg"
			);
		});
	});
});
