import {
	extractFrontmatterTotals,
	nutrientDataToFrontmatterTotals,
	applyNutrientTotalsToFrontmatter,
	FRONTMATTER_KEYS,
	FRONTMATTER_PREFIX,
} from "../FrontmatterTotalsService";
import { NutrientData } from "../NutritionCalculator";
import { DEFAULT_FRONTMATTER_FIELD_NAMES, FrontmatterFieldNames } from "../SettingsService";

describe("FrontmatterTotalsService", () => {
	describe("FRONTMATTER_PREFIX (deprecated)", () => {
		test("should be 'ft-'", () => {
			expect(FRONTMATTER_PREFIX).toBe("ft-");
		});
	});

	describe("FRONTMATTER_KEYS (deprecated)", () => {
		test("should have correct prefixed keys for all nutrients", () => {
			expect(FRONTMATTER_KEYS.calories).toBe("ft-calories");
			expect(FRONTMATTER_KEYS.fats).toBe("ft-fats");
			expect(FRONTMATTER_KEYS.saturated_fats).toBe("ft-saturated_fats");
			expect(FRONTMATTER_KEYS.protein).toBe("ft-protein");
			expect(FRONTMATTER_KEYS.carbs).toBe("ft-carbs");
			expect(FRONTMATTER_KEYS.fiber).toBe("ft-fiber");
			expect(FRONTMATTER_KEYS.sugar).toBe("ft-sugar");
			expect(FRONTMATTER_KEYS.sodium).toBe("ft-sodium");
		});

		test("should equal DEFAULT_FRONTMATTER_FIELD_NAMES for backward compatibility", () => {
			expect(FRONTMATTER_KEYS).toEqual(DEFAULT_FRONTMATTER_FIELD_NAMES);
		});
	});

	describe("extractFrontmatterTotals", () => {
		describe("with default field names", () => {
			test("returns null when frontmatter has no food tracker properties", () => {
				const frontmatter = {
					title: "My Note",
					date: "2024-01-15",
				};

				expect(extractFrontmatterTotals(frontmatter)).toBeNull();
			});

			test("extracts all nutrition values from frontmatter", () => {
				const frontmatter = {
					"ft-calories": 1500,
					"ft-fats": 65.5,
					"ft-saturated_fats": 20.3,
					"ft-protein": 120.7,
					"ft-carbs": 180.2,
					"ft-fiber": 25.1,
					"ft-sugar": 45.8,
					"ft-sodium": 2100.5,
				};

				const result = extractFrontmatterTotals(frontmatter);

				expect(result).toEqual({
					calories: 1500,
					fats: 65.5,
					saturated_fats: 20.3,
					protein: 120.7,
					carbs: 180.2,
					fiber: 25.1,
					sugar: 45.8,
					sodium: 2100.5,
				});
			});

			test("extracts partial nutrition values", () => {
				const frontmatter = {
					"ft-calories": 800,
					"ft-protein": 50,
					title: "Lunch",
				};

				const result = extractFrontmatterTotals(frontmatter);

				expect(result).toEqual({
					calories: 800,
					protein: 50,
				});
			});

			test("handles string values by parsing them as numbers", () => {
				const frontmatter = {
					"ft-calories": "1200",
					"ft-fats": "45.5",
				};

				const result = extractFrontmatterTotals(frontmatter);

				expect(result).toEqual({
					calories: 1200,
					fats: 45.5,
				});
			});

			test("ignores invalid non-numeric values", () => {
				const frontmatter = {
					"ft-calories": 500,
					"ft-fats": "invalid",
					"ft-protein": null,
					"ft-carbs": undefined,
				};

				const result = extractFrontmatterTotals(frontmatter);

				expect(result).toEqual({
					calories: 500,
				});
			});

			test("handles zero values", () => {
				const frontmatter = {
					"ft-calories": 0,
					"ft-protein": 0,
				};

				const result = extractFrontmatterTotals(frontmatter);

				expect(result).toEqual({
					calories: 0,
					protein: 0,
				});
			});

			test("handles negative values from workout-only files", () => {
				const frontmatter = {
					"ft-calories": -300,
				};

				const result = extractFrontmatterTotals(frontmatter);

				expect(result).toEqual({
					calories: -300,
				});
			});
		});

		describe("with custom field names", () => {
			const customFieldNames: FrontmatterFieldNames = {
				calories: "calories",
				fats: "fat",
				saturated_fats: "saturated-fat",
				protein: "protein",
				carbs: "carbohydrates",
				fiber: "fiber",
				sugar: "sugar",
				sodium: "sodium",
			};

			test("extracts values using custom field names", () => {
				const frontmatter = {
					calories: 2000,
					fat: 80,
					protein: 100,
				};

				const result = extractFrontmatterTotals(frontmatter, customFieldNames);

				expect(result).toEqual({
					calories: 2000,
					fats: 80,
					protein: 100,
				});
			});

			test("extracts all nutrition values with custom field names", () => {
				const frontmatter = {
					calories: 1800,
					fat: 70.5,
					"saturated-fat": 25.3,
					protein: 110.7,
					carbohydrates: 200.2,
					fiber: 30.1,
					sugar: 50.8,
					sodium: 1900.5,
				};

				const result = extractFrontmatterTotals(frontmatter, customFieldNames);

				expect(result).toEqual({
					calories: 1800,
					fats: 70.5,
					saturated_fats: 25.3,
					protein: 110.7,
					carbs: 200.2,
					fiber: 30.1,
					sugar: 50.8,
					sodium: 1900.5,
				});
			});

			test("ignores default ft- prefixed fields when using custom names", () => {
				const frontmatter = {
					"ft-calories": 1500,
					calories: 2000,
				};

				const result = extractFrontmatterTotals(frontmatter, customFieldNames);

				expect(result).toEqual({
					calories: 2000,
				});
			});

			test("returns null when custom field names are not present", () => {
				const frontmatter = {
					"ft-calories": 1500,
					"ft-protein": 80,
				};

				const result = extractFrontmatterTotals(frontmatter, customFieldNames);

				expect(result).toBeNull();
			});
		});
	});

	describe("nutrientDataToFrontmatterTotals", () => {
		test("converts NutrientData to FrontmatterTotals with proper rounding", () => {
			const data: NutrientData = {
				calories: 1523.7,
				fats: 65.55,
				saturated_fats: 20.34,
				protein: 120.75,
				carbs: 180.24,
				fiber: 25.16,
				sugar: 45.84,
				sodium: 2100.55,
			};

			const result = nutrientDataToFrontmatterTotals(data);

			expect(result).toEqual({
				calories: 1524,
				fats: 65.6,
				saturated_fats: 20.3,
				protein: 120.8,
				carbs: 180.2,
				fiber: 25.2,
				sugar: 45.8,
				sodium: 2100.6,
			});
		});

		test("only includes defined values", () => {
			const data: NutrientData = {
				calories: 500,
				protein: 25,
			};

			const result = nutrientDataToFrontmatterTotals(data);

			expect(result).toEqual({
				calories: 500,
				protein: 25,
			});
			expect(result.fats).toBeUndefined();
			expect(result.carbs).toBeUndefined();
		});

		test("handles empty NutrientData", () => {
			const data: NutrientData = {};

			const result = nutrientDataToFrontmatterTotals(data);

			expect(result).toEqual({});
		});

		test("rounds calories to nearest integer", () => {
			expect(nutrientDataToFrontmatterTotals({ calories: 1500.4 }).calories).toBe(1500);
			expect(nutrientDataToFrontmatterTotals({ calories: 1500.5 }).calories).toBe(1501);
			expect(nutrientDataToFrontmatterTotals({ calories: 1500.9 }).calories).toBe(1501);
		});

		test("rounds other nutrients to one decimal place", () => {
			expect(nutrientDataToFrontmatterTotals({ fats: 10.14 }).fats).toBe(10.1);
			expect(nutrientDataToFrontmatterTotals({ fats: 10.15 }).fats).toBe(10.2);
			expect(nutrientDataToFrontmatterTotals({ protein: 25.999 }).protein).toBe(26);
		});

		test("excludes serving_size from output", () => {
			const data: NutrientData = {
				calories: 100,
				serving_size: 150,
			};

			const result = nutrientDataToFrontmatterTotals(data);

			expect(result).toEqual({
				calories: 100,
			});
			expect("serving_size" in result).toBe(false);
		});
	});

	describe("applyNutrientTotalsToFrontmatter", () => {
		describe("with default field names", () => {
			test("sets existing values to 0 when totals is null", () => {
				const frontmatter: Record<string, unknown> = {
					title: "My Note",
					"ft-calories": 500,
					"ft-protein": 25,
				};

				applyNutrientTotalsToFrontmatter(frontmatter, null);

				expect(frontmatter["ft-calories"]).toBe(0);
				expect(frontmatter["ft-protein"]).toBe(0);
				expect(frontmatter["ft-fats"]).toBeUndefined();
				expect(frontmatter["ft-saturated_fats"]).toBeUndefined();
				expect(frontmatter["ft-carbs"]).toBeUndefined();
				expect(frontmatter["ft-fiber"]).toBeUndefined();
				expect(frontmatter["ft-sugar"]).toBeUndefined();
				expect(frontmatter["ft-sodium"]).toBeUndefined();
				expect(frontmatter.title).toBe("My Note");
			});

			test("sets existing values to 0 when totals is empty object", () => {
				const frontmatter: Record<string, unknown> = {
					"ft-calories": 1000,
				};

				applyNutrientTotalsToFrontmatter(frontmatter, {});

				expect(frontmatter["ft-calories"]).toBe(0);
				expect(frontmatter["ft-protein"]).toBeUndefined();
			});

			test("applies calculated totals to frontmatter", () => {
				const frontmatter: Record<string, unknown> = {};

				applyNutrientTotalsToFrontmatter(frontmatter, {
					calories: 1500,
					protein: 75.5,
					fats: 60.3,
				});

				expect(frontmatter["ft-calories"]).toBe(1500);
				expect(frontmatter["ft-protein"]).toBe(75.5);
				expect(frontmatter["ft-fats"]).toBe(60.3);
				expect(frontmatter["ft-carbs"]).toBeUndefined();
				expect(frontmatter["ft-fiber"]).toBeUndefined();
			});

			test("preserves non-ft properties in frontmatter", () => {
				const frontmatter: Record<string, unknown> = {
					title: "Daily Note",
					date: "2024-01-15",
					tags: ["daily"],
				};

				applyNutrientTotalsToFrontmatter(frontmatter, null);

				expect(frontmatter.title).toBe("Daily Note");
				expect(frontmatter.date).toBe("2024-01-15");
				expect(frontmatter.tags).toEqual(["daily"]);
			});

			test("rounds values according to nutrientDataToFrontmatterTotals", () => {
				const frontmatter: Record<string, unknown> = {};

				applyNutrientTotalsToFrontmatter(frontmatter, {
					calories: 1523.7,
					protein: 75.55,
				});

				expect(frontmatter["ft-calories"]).toBe(1524);
				expect(frontmatter["ft-protein"]).toBe(75.6);
			});

			test("handles negative calories from workout-only notes", () => {
				const frontmatter: Record<string, unknown> = {};

				applyNutrientTotalsToFrontmatter(frontmatter, {
					calories: -300,
				});

				expect(frontmatter["ft-calories"]).toBe(-300);
				expect(frontmatter["ft-protein"]).toBeUndefined();
			});

			test("keeps existing zero values", () => {
				const frontmatter: Record<string, unknown> = {
					"ft-calories": 0,
					"ft-protein": 0,
					"ft-carbs": 100,
				};

				applyNutrientTotalsToFrontmatter(frontmatter, {
					calories: 0,
					protein: 50,
				});

				expect(frontmatter["ft-calories"]).toBe(0);
				expect(frontmatter["ft-protein"]).toBe(50);
				expect(frontmatter["ft-carbs"]).toBe(0);
				expect(frontmatter["ft-fats"]).toBeUndefined();
			});

			test("does not create zero-valued properties that don't exist", () => {
				const frontmatter: Record<string, unknown> = {};

				applyNutrientTotalsToFrontmatter(frontmatter, {
					calories: 1000,
					protein: 0,
				});

				expect(frontmatter["ft-calories"]).toBe(1000);
				expect(frontmatter["ft-protein"]).toBeUndefined();
				expect(frontmatter["ft-fats"]).toBeUndefined();
			});

			test("keeps existing properties with zero when totals is null", () => {
				const frontmatter: Record<string, unknown> = {
					"ft-calories": 500,
					"ft-protein": 25,
					"ft-carbs": 100,
				};

				applyNutrientTotalsToFrontmatter(frontmatter, null);

				expect(frontmatter["ft-calories"]).toBe(0);
				expect(frontmatter["ft-protein"]).toBe(0);
				expect(frontmatter["ft-carbs"]).toBe(0);
				expect(frontmatter["ft-fats"]).toBeUndefined();
			});
		});

		describe("with custom field names", () => {
			const customFieldNames: FrontmatterFieldNames = {
				calories: "calories",
				fats: "fat",
				saturated_fats: "saturated-fat",
				protein: "protein",
				carbs: "carbohydrates",
				fiber: "fiber",
				sugar: "sugar",
				sodium: "sodium",
			};

			test("applies totals using custom field names", () => {
				const frontmatter: Record<string, unknown> = {};

				applyNutrientTotalsToFrontmatter(
					frontmatter,
					{
						calories: 1500,
						protein: 75.5,
						fats: 60.3,
					},
					customFieldNames
				);

				expect(frontmatter["calories"]).toBe(1500);
				expect(frontmatter["protein"]).toBe(75.5);
				expect(frontmatter["fat"]).toBe(60.3);
				expect(frontmatter["ft-calories"]).toBeUndefined();
				expect(frontmatter["ft-protein"]).toBeUndefined();
			});

			test("applies all totals with custom field names", () => {
				const frontmatter: Record<string, unknown> = {};

				applyNutrientTotalsToFrontmatter(
					frontmatter,
					{
						calories: 2000,
						fats: 80,
						saturated_fats: 25,
						protein: 100,
						carbs: 250,
						fiber: 30,
						sugar: 50,
						sodium: 2200,
					},
					customFieldNames
				);

				expect(frontmatter["calories"]).toBe(2000);
				expect(frontmatter["fat"]).toBe(80);
				expect(frontmatter["saturated-fat"]).toBe(25);
				expect(frontmatter["protein"]).toBe(100);
				expect(frontmatter["carbohydrates"]).toBe(250);
				expect(frontmatter["fiber"]).toBe(30);
				expect(frontmatter["sugar"]).toBe(50);
				expect(frontmatter["sodium"]).toBe(2200);
			});

			test("sets existing custom field values to 0 when totals is null", () => {
				const frontmatter: Record<string, unknown> = {
					title: "My Note",
					calories: 500,
					protein: 25,
				};

				applyNutrientTotalsToFrontmatter(frontmatter, null, customFieldNames);

				expect(frontmatter["calories"]).toBe(0);
				expect(frontmatter["protein"]).toBe(0);
				expect(frontmatter.title).toBe("My Note");
				expect(frontmatter["ft-calories"]).toBeUndefined();
			});

			test("does not affect default ft- prefixed fields when using custom names", () => {
				const frontmatter: Record<string, unknown> = {
					"ft-calories": 1500,
				};

				applyNutrientTotalsToFrontmatter(
					frontmatter,
					{
						calories: 2000,
					},
					customFieldNames
				);

				expect(frontmatter["ft-calories"]).toBe(1500);
				expect(frontmatter["calories"]).toBe(2000);
			});

			test("handles mixed existing and new fields with custom names", () => {
				const frontmatter: Record<string, unknown> = {
					calories: 500,
					carbohydrates: 100,
				};

				applyNutrientTotalsToFrontmatter(
					frontmatter,
					{
						calories: 1200,
						protein: 60,
					},
					customFieldNames
				);

				expect(frontmatter["calories"]).toBe(1200);
				expect(frontmatter["protein"]).toBe(60);
				expect(frontmatter["carbohydrates"]).toBe(0);
			});
		});
	});
});
