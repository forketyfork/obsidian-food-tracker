import {
	extractFoodHighlightRanges,
	extractMultilineHighlightRanges,
	extractInlineCalorieAnnotations,
} from "../FoodHighlightCore";

describe("FoodHighlightCore", () => {
	const defaultOptions = {
		escapedFoodTag: "food",
		escapedWorkoutTag: "workout",
		foodTag: "food",
		workoutTag: "workout",
	};

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
				expect(ranges[0]).toEqual({ start: 15, end: 23, type: "negative-kcal" }); // -150kcal
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

			test("highlights markdown links with paths", () => {
				const text = "#food [Tartine brioche Nutella](../nutrients/Tartine%20brioche%20Nutella.md) 250g";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toEqual([{ start: 77, end: 81, type: "amount" }]);
			});

			test("highlights wikilinks with .md extension", () => {
				const text = "#food [[Chicken Breast.md]] 175g";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(1);
				expect(ranges[0]).toEqual({ start: 28, end: 32, type: "amount" });
			});

			test("highlights markdown links with headings", () => {
				const text = "#food [Salmon](nutrients/Salmon.md#info) 100g";
				const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

				expect(ranges).toHaveLength(1);
				expect(ranges[0]).toEqual({ start: 41, end: 45, type: "amount" });
			});
		});

		describe("custom food tags", () => {
			test("works with custom food tags", () => {
				const text = "#nutrition Chicken Breast 300kcal 25prot";
				const ranges = extractFoodHighlightRanges(text, 0, {
					escapedFoodTag: "nutrition",
					escapedWorkoutTag: "workout",
					foodTag: "nutrition",
					workoutTag: "workout",
				});

				expect(ranges).toHaveLength(2);
				expect(ranges[0]).toEqual({ start: 26, end: 33, type: "nutrition" }); // 300kcal
				expect(ranges[1]).toEqual({ start: 34, end: 40, type: "nutrition" }); // 25prot
			});

			test("works with escaped special characters in food tags", () => {
				const text = "#food-tracker Chicken 300kcal";
				const ranges = extractFoodHighlightRanges(text, 0, {
					escapedFoodTag: "food\\-tracker",
					escapedWorkoutTag: "workout",
					foodTag: "food-tracker",
					workoutTag: "workout",
				});

				expect(ranges).toHaveLength(1);
				expect(ranges[0]).toEqual({ start: 22, end: 29, type: "nutrition" }); // 300kcal
			});

			test("works when workout tag is disabled", () => {
				const text = "#food [[Apple]] 150g";
				const ranges = extractFoodHighlightRanges(text, 0, {
					escapedFoodTag: "food",
					escapedWorkoutTag: "",
					foodTag: "food",
					workoutTag: "",
				});

				expect(ranges).toHaveLength(1);
				expect(ranges[0]).toEqual({ start: 16, end: 20, type: "amount" });
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

	describe("workout tag support", () => {
		test("highlights nutrition values with workout tag using red style", () => {
			const text = "#workout training 300kcal";
			const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

			expect(ranges).toHaveLength(1);
			expect(ranges[0]).toEqual({ start: 18, end: 25, type: "negative-kcal" }); // 300kcal (red for workout)
		});

		test("does not highlight negative kcal values with workout tag", () => {
			const text = "#workout cardio -150kcal";
			const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

			expect(ranges).toHaveLength(0); // Negative workout calories are invalid and not highlighted
		});

		test("still highlights negative kcal values with food tag", () => {
			const text = "#food workout -150kcal";
			const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

			expect(ranges).toHaveLength(1);
			expect(ranges[0]).toEqual({ start: 14, end: 22, type: "negative-kcal" }); // -150kcal
		});

		test("treats #workout inside food entry as food highlight", () => {
			const text = "#food #workout shake 150kcal";
			const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

			expect(ranges).toHaveLength(1);
			expect(ranges[0]).toEqual({ start: 21, end: 28, type: "nutrition" }); // 150kcal stays blue
		});

		test("highlights multiple nutrition values with workout tag (only kcal in red)", () => {
			const text = "#workout strength 500kcal 40prot 10fat";
			const ranges = extractFoodHighlightRanges(text, 0, defaultOptions);

			expect(ranges).toHaveLength(3);
			expect(ranges[0]).toEqual({ start: 18, end: 25, type: "negative-kcal" }); // 500kcal (red for workout)
			expect(ranges[1]).toEqual({ start: 26, end: 32, type: "nutrition" }); // 40prot (normal blue)
			expect(ranges[2]).toEqual({ start: 33, end: 38, type: "nutrition" }); // 10fat (normal blue)
		});

		test("works with both food and workout tags in multiline text", () => {
			const text = `#food Breakfast 300kcal
#workout training 150kcal
#food Lunch 200kcal`;

			const ranges = extractMultilineHighlightRanges(text, 0, defaultOptions);

			expect(ranges).toHaveLength(3);
			expect(ranges[0]).toEqual({ start: 16, end: 23, type: "nutrition" }); // 300kcal from food (normal blue)
			expect(ranges[1]).toEqual({ start: 42, end: 49, type: "negative-kcal" }); // 150kcal from workout (red)
			expect(ranges[2]).toEqual({ start: 62, end: 69, type: "nutrition" }); // 200kcal from food (normal blue)
		});
	});

	describe("extractInlineCalorieAnnotations", () => {
		const calorieMap: Record<string, number> = {
			bread: 290,
			pasta: 350,
			rice: 130,
			cookie: 150,
			"tartine brioche nutella": 120,
		};

		const servingSizeMap: Record<string, number> = {
			cookie: 50,
		};

		const nutritionPerMap: Record<string, number> = {
			cookie: 28,
		};

		const provider = {
			getCaloriesForFood: (fileName: string): number | null => {
				return calorieMap[fileName.toLowerCase()] ?? null;
			},
			getServingSize: (fileName: string): number | null => {
				return servingSizeMap[fileName.toLowerCase()] ?? null;
			},
			getNutritionPer: (fileName: string): number | null => {
				return nutritionPerMap[fileName.toLowerCase()] ?? null;
			},
		};

		describe("linked food entries with various units", () => {
			test("adds annotation for gram-based food entry", () => {
				const text = "#food [[Bread]] 10g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "29kcal",
					},
				]);
			});

			test("adds annotation for kilogram-based food entry", () => {
				const text = "#food [[Bread]] 0.2kg";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "580kcal",
					},
				]);
			});

			test("adds annotation for cup-based food entry", () => {
				const text = "#food [[Rice]] 1cup";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "312kcal",
					},
				]);
			});

			test("adds annotation for tablespoon-based food entry", () => {
				const text = "#food [[Pasta]] 2tbsp";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "105kcal",
					},
				]);
			});

			test("adds annotation for milliliter-based food entry", () => {
				const text = "#food [[Bread]] 100ml";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "290kcal",
					},
				]);
			});

			test("adds annotation for ounce-based food entry", () => {
				const text = "#food [[Rice]] 5oz";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "184kcal",
					},
				]);
			});

			test("uses nutrition_per for calorie annotations when provided", () => {
				const text = "#food [[Cookie]] 28g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "150kcal",
					},
				]);
			});

			test("normalizes wikilink aliases", () => {
				const text = "#food [[bread|Slice]] 20g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "58kcal",
					},
				]);
			});

			test("supports markdown links with encoded paths", () => {
				const text = "#food [Tartine brioche Nutella](../nutrients/Tartine%20brioche%20Nutella.md) 100g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "120kcal",
					},
				]);
			});

			test("supports wikilinks with .md extension", () => {
				const text = "#food [[bread.md]] 50g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "145kcal",
					},
				]);
			});

			test("supports markdown links with headings", () => {
				const text = "#food [Rice](nutrients/rice.md#info) 100g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "130kcal",
					},
				]);
			});

			test("respects start offset", () => {
				const text = "#food [[Pasta]] 50g";
				const annotations = extractInlineCalorieAnnotations(text, 100, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length + 100,
						text: "175kcal",
					},
				]);
			});

			test("skips entries when calorie data is missing", () => {
				const text = "#food [[Unknown]] 10g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([]);
			});

			test("handles workout tag entries without calorie data", () => {
				const text = "#workout [[Running]] 200g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([]);
			});

			test("retains annotations when portions round down to zero", () => {
				const text = "#food [[Bread]] 0.1g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "0kcal",
					},
				]);
			});

			test("adds negative annotation for workout tag entry with calorie data", () => {
				const text = "#workout [[Bread]] 100g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "-290kcal",
					},
				]);
			});
		});

		describe("direct kcal entries", () => {
			test("adds annotation for direct kcal food entry", () => {
				const text = "#food Chicken 300kcal";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "300kcal",
					},
				]);
			});

			test("adds annotation for direct kcal workout entry with negative value", () => {
				const text = "#workout Running 120kcal";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "-120kcal",
					},
				]);
			});

			test("adds annotation for multi-word food name with direct kcal", () => {
				const text = "#food Grilled Chicken 250kcal";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "250kcal",
					},
				]);
			});

			test("handles decimal kcal values", () => {
				const text = "#food Snack 123.5kcal";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "124kcal",
					},
				]);
			});

			test("keeps zero kcal entries but skips negative ones", () => {
				const text1 = "#food Something 0kcal";
				const text2 = "#food Something -10kcal";
				const annotations1 = extractInlineCalorieAnnotations(text1, 0, defaultOptions, provider);
				const annotations2 = extractInlineCalorieAnnotations(text2, 0, defaultOptions, provider);

				expect(annotations1).toEqual([
					{
						position: text1.length,
						text: "0kcal",
					},
				]);
				expect(annotations2).toEqual([]);
			});

			test("avoids negative zero for workout annotations", () => {
				const text = "#workout Run 0kcal";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "0kcal",
					},
				]);
			});
		});

		describe("multiple annotations", () => {
			test("handles multiple entries in one line", () => {
				const text = "#food [[Bread]] 10g #food Chicken 300kcal";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toHaveLength(2);
				expect(annotations[0]).toEqual({
					position: text.length,
					text: "29kcal",
				});
				expect(annotations[1]).toEqual({
					position: text.length,
					text: "300kcal",
				});
			});

			test("places annotations at end of each respective line in multiline text", () => {
				const text = "#food [[Bread]] 10g\n#food [[Pasta]] 50g\nSome other text";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toHaveLength(2);
				expect(annotations[0]).toEqual({
					position: 19,
					text: "29kcal",
				});
				expect(annotations[1]).toEqual({
					position: 39,
					text: "175kcal",
				});
			});
		});

		describe("positioning edge cases", () => {
			test("direct kcal entry on second line should not appear on first line", () => {
				const text = "#food test\n#food test2 300kcal";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toHaveLength(1);

				// Calculate expected positions
				const firstLineEnd = text.indexOf("\n"); // Should be 10
				const secondLineEnd = text.length; // Should be 31

				// The annotation should be at the end of line 2, NOT line 1
				expect(annotations[0].position).toBe(secondLineEnd);
				expect(annotations[0].position).not.toBe(firstLineEnd);
				expect(annotations[0].text).toBe("300kcal");
			});

			test("linked food on second line should not appear on first line", () => {
				const text = "#food test\n#food [[Bread]] 10g";
				const annotations = extractInlineCalorieAnnotations(text, 0, defaultOptions, provider);

				expect(annotations).toHaveLength(1);

				// Calculate expected positions
				const firstLineEnd = text.indexOf("\n"); // Should be 10
				const secondLineEnd = text.length; // Should be 27

				// The annotation should be at the end of line 2, NOT line 1
				expect(annotations[0].position).toBe(secondLineEnd);
				expect(annotations[0].position).not.toBe(firstLineEnd);
				expect(annotations[0].text).toBe("29kcal");
			});
		});

		describe("edge cases", () => {
			test("works when workout tag is empty", () => {
				const text = "#food [[Bread]] 10g";
				const annotations = extractInlineCalorieAnnotations(
					text,
					0,
					{
						escapedFoodTag: "food",
						escapedWorkoutTag: "",
						foodTag: "food",
						workoutTag: "",
					},
					provider
				);

				expect(annotations).toEqual([
					{
						position: text.length,
						text: "29kcal",
					},
				]);
			});

			test("returns empty array when all tags are empty", () => {
				const text = "#food [[Bread]] 10g";
				const annotations = extractInlineCalorieAnnotations(
					text,
					0,
					{
						escapedFoodTag: "",
						escapedWorkoutTag: "",
						foodTag: "",
						workoutTag: "",
					},
					provider
				);

				expect(annotations).toEqual([]);
			});
		});
	});
});
