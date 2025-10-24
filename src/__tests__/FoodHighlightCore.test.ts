import { extractFoodHighlightRanges, extractMultilineHighlightRanges } from "../FoodHighlightCore";

describe("FoodHighlightCore", () => {
	const defaultOptions = { escapedFoodTag: "food" };

	describe("extractFoodHighlightRanges", () => {
		describe("inline nutrition format", () => {
			test("highlights individual nutrition values", () => {
				const text = "#food Chicken Breast 300kcal 25prot 5fat 0carbs";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(4);
				expect(ranges[0]).toEqual({ start: 21, end: 28, type: "nutrition" }); // 300kcal
				expect(ranges[1]).toEqual({ start: 29, end: 35, type: "nutrition" }); // 25prot
				expect(ranges[2]).toEqual({ start: 36, end: 40, type: "nutrition" }); // 5fat
				expect(ranges[3]).toEqual({ start: 41, end: 47, type: "nutrition" }); // 0carbs
			});

			test("handles decimal values", () => {
				const text = "#food Salmon 150.5kcal 12.3fat";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(2);
				expect(ranges[0]).toEqual({ start: 13, end: 22, type: "nutrition" }); // 150.5kcal
				expect(ranges[1]).toEqual({ start: 23, end: 30, type: "nutrition" }); // 12.3fat
			});

			test("handles mixed case nutrition keywords", () => {
				const text = "#food Snack 200KCAL 10FAT 15PROT";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(3);
				expect(ranges[0]).toEqual({ start: 12, end: 19, type: "nutrition" }); // 200KCAL
				expect(ranges[1]).toEqual({ start: 20, end: 25, type: "nutrition" }); // 10FAT
				expect(ranges[2]).toEqual({ start: 26, end: 32, type: "nutrition" }); // 15PROT
			});

			test("handles negative nutrition values", () => {
				const text = "#food Recovery -150kcal";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(1);
				expect(ranges[0]).toEqual({ start: 15, end: 23, type: "nutrition" }); // -150kcal
			});

			test("handles complex food names with multiple words", () => {
				const text = "#food Grilled Chicken with Rice and Vegetables 450kcal 35prot 8fat 45carbs 2sugar";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(5);
				expect(ranges[0]).toEqual({ start: 47, end: 54, type: "nutrition" }); // 450kcal
				expect(ranges[1]).toEqual({ start: 55, end: 61, type: "nutrition" }); // 35prot
				expect(ranges[2]).toEqual({ start: 62, end: 66, type: "nutrition" }); // 8fat
				expect(ranges[3]).toEqual({ start: 67, end: 74, type: "nutrition" }); // 45carbs
				expect(ranges[4]).toEqual({ start: 75, end: 81, type: "nutrition" }); // 2sugar
			});

			test("ignores food names that start with [[", () => {
				const text = "#food [[Chicken]] 300kcal 25prot";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(0);
			});
		});

		describe("linked food format", () => {
			test("highlights amount values with weight units", () => {
				const text = "#food [[Chicken Breast]] 200g";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(1);
				expect(ranges[0]).toEqual({ start: 25, end: 29, type: "amount" }); // 200g
			});

			test("handles various units", () => {
				const testCases = [
					{ text: "#food [[Apple]] 1.5kg", expectedRange: { start: 16, end: 21 } },
					{ text: "#food [[Milk]] 500ml", expectedRange: { start: 15, end: 20 } },
					{ text: "#food [[Flour]] 2cups", expectedRange: { start: 16, end: 21 } },
					{ text: "#food [[Oil]] 3tbsp", expectedRange: { start: 14, end: 19 } },
					{ text: "#food [[Salt]] 1tsp", expectedRange: { start: 15, end: 19 } },
					{ text: "#food [[Cheese]] 4oz", expectedRange: { start: 17, end: 20 } },
					{ text: "#food [[Meat]] 1.2lb", expectedRange: { start: 15, end: 20 } },
					{ text: "#food [[Water]] 1l", expectedRange: { start: 16, end: 18 } },
					{ text: "#food [[Banana]] 1pc", expectedRange: { start: 17, end: 20 } },
				];

				testCases.forEach(({ text, expectedRange }) => {
					const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);
					expect(ranges).toHaveLength(1);
					expect(ranges[0]).toEqual({ ...expectedRange, type: "amount" });
				});
			});

			test("ignores amounts without brackets", () => {
				const text = "#food Chicken 200g";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(0);
			});

			test("handles decimal amounts", () => {
				const text = "#food [[Pasta]] 125.5g";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(1);
				expect(ranges[0]).toEqual({ start: 16, end: 22, type: "amount" }); // 125.5g
			});
		});

		describe("custom food tags", () => {
			test("works with custom food tags", () => {
				const text = "#nutrition Chicken Breast 300kcal 25prot";
				const ranges = extractFoodHighlightRanges(text, 0, { escapedFoodTag: "nutrition" });

				expect(ranges).toHaveLength(2);
				expect(ranges[0]).toEqual({ start: 26, end: 33, type: "nutrition" }); // 300kcal
				expect(ranges[1]).toEqual({ start: 34, end: 40, type: "nutrition" }); // 25prot
			});

			test("works with escaped special characters in food tags", () => {
				const text = "#food-tracker Chicken 300kcal";
				const ranges = extractFoodHighlightRanges(text, 0, { escapedFoodTag: "food\\-tracker" });

				expect(ranges).toHaveLength(1);
				expect(ranges[0]).toEqual({ start: 22, end: 29, type: "nutrition" }); // 300kcal
			});
		});

		describe("edge cases", () => {
			test("returns empty array for non-matching text", () => {
				const text = "This is just regular text";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(0);
			});

			test("returns empty array for incomplete food entries", () => {
				const text = "#food Chicken";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(0);
			});

			test("handles text with no nutrition values", () => {
				const text = "#food Chicken sometext";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(0);
			});

			test("accounts for line start offset", () => {
				const text = "#food Chicken 300kcal";
				const ranges = extractFoodHighlightRanges(text, 100, defaultOptions);

				expect(ranges).toHaveLength(1);
				expect(ranges[0]).toEqual({ start: 114, end: 121, type: "nutrition" }); // 300kcal at offset 100
			});
		});

		describe("position accuracy", () => {
			test("handles repeated substrings correctly", () => {
				// Test case where the matched nutrition value appears earlier in the line
				const text = "#food 300kcal Cereal with 300kcal 15prot";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(2);
				// Should highlight the second occurrence (part of nutrition values), not the first
				expect(ranges[0]).toEqual({ start: 26, end: 33, type: "nutrition" }); // 300kcal
				expect(ranges[1]).toEqual({ start: 34, end: 40, type: "nutrition" }); // 15prot
			});

			test("handles repeated amount values correctly", () => {
				const text = "#food [[200g Rice]] 200g";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(1);
				// Should highlight the first occurrence within the brackets
				expect(ranges[0]).toEqual({ start: 8, end: 12, type: "amount" }); // 200g
			});
		});
	});

	describe("extractMultilineHighlightRanges", () => {
		test("processes multiple lines correctly", () => {
			const text = `#food Breakfast 300kcal 20fat
#food [[Lunch]] 150g
Regular text line
#food Dinner 400kcal 30prot 10fat`;

			const ranges = extractMultilineHighlightRanges(text, 0, defaultOptions);

			expect(ranges).toHaveLength(6);

			// First line: Breakfast nutrition values
			expect(ranges[0]).toEqual({ start: 16, end: 23, type: "nutrition" }); // 300kcal
			expect(ranges[1]).toEqual({ start: 24, end: 29, type: "nutrition" }); // 20fat

			// Second line: Lunch amount
			expect(ranges[2]).toEqual({ start: 46, end: 50, type: "amount" }); // 150g

			// Fourth line: Dinner nutrition values
			expect(ranges[3]).toEqual({ start: 82, end: 89, type: "nutrition" }); // 400kcal
			expect(ranges[4]).toEqual({ start: 90, end: 96, type: "nutrition" }); // 30prot
			expect(ranges[5]).toEqual({ start: 97, end: 102, type: "nutrition" }); // 10fat
		});

		test("handles empty lines", () => {
			const text = `#food Breakfast 300kcal

#food Lunch 200kcal`;

			const ranges = extractMultilineHighlightRanges(text, 0, defaultOptions);

			expect(ranges).toHaveLength(2);
			expect(ranges[0]).toEqual({ start: 16, end: 23, type: "nutrition" }); // 300kcal
			expect(ranges[1]).toEqual({ start: 37, end: 44, type: "nutrition" }); // 200kcal
		});

		test("accounts for start offset", () => {
			const text = `#food Breakfast 300kcal
#food Lunch 200kcal`;

			const ranges = extractMultilineHighlightRanges(text, 50, defaultOptions);

			expect(ranges).toHaveLength(2);
			expect(ranges[0]).toEqual({ start: 66, end: 73, type: "nutrition" }); // 300kcal (16 + 50)
			expect(ranges[1]).toEqual({ start: 86, end: 93, type: "nutrition" }); // 200kcal (36 + 50)
		});
	});
});
