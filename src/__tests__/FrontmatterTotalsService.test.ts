import {
	extractFrontmatterTotals,
	nutrientDataToFrontmatterTotals,
	FRONTMATTER_KEYS,
	FRONTMATTER_PREFIX,
} from "../FrontmatterTotalsService";
import { NutrientData } from "../NutritionCalculator";

describe("FrontmatterTotalsService", () => {
	describe("FRONTMATTER_PREFIX", () => {
		test("should be 'ft-'", () => {
			expect(FRONTMATTER_PREFIX).toBe("ft-");
		});
	});

	describe("FRONTMATTER_KEYS", () => {
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
	});

	describe("extractFrontmatterTotals", () => {
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
});
