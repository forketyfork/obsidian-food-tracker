import { calculateNutritionTotals, NutritionCalculationParams } from "../NutritionCalculator";

describe("calculateNutritionTotals", () => {
	const buildParams = (overrides: Partial<NutritionCalculationParams>): NutritionCalculationParams => ({
		content: "",
		getNutritionData: () => null,
		...overrides,
	});

	test("returns null when content has no food or workout entries", () => {
		const result = calculateNutritionTotals(
			buildParams({
				content: "Regular note without any tags.",
			})
		);

		expect(result).toBeNull();
	});

	test("aggregates linked food entries using nutrition data and units", () => {
		const getNutritionData = jest
			.fn()
			.mockReturnValueOnce({ calories: 100, protein: 10 })
			.mockReturnValueOnce({ calories: 80, carbs: 20 });

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[apple]] 150g\n#food [[banana]] 50g",
				getNutritionData,
			})
		);

		expect(getNutritionData).toHaveBeenNthCalledWith(1, "apple");
		expect(getNutritionData).toHaveBeenNthCalledWith(2, "banana");
		expect(result).not.toBeNull();
		expect(result?.linkedTotals.calories).toBeCloseTo(190); // 100 * 1.5 + 80 * 0.5
		expect(result?.linkedTotals.protein).toBeCloseTo(15); // 10 * 1.5
		expect(result?.linkedTotals.carbs).toBeCloseTo(10); // 20 * 0.5
		expect(result?.combinedTotals.calories).toBeCloseTo(190);
		expect(result?.clampedTotals.calories).toBeCloseTo(190);
	});

	test("includes inline nutrition, subtracts workout calories, and preserves workout totals", () => {
		const getNutritionData = jest.fn().mockReturnValue({ calories: 50, fats: 5 });

		const result = calculateNutritionTotals(
			buildParams({
				content: `#food Breakfast 300kcal 20prot
#workout Run 150kcal
#food [[bar]] 100g`,
				getNutritionData,
			})
		);

		expect(result).not.toBeNull();
		expect(result?.inlineTotals.calories).toBeCloseTo(150); // 300 - 150
		expect(result?.inlineTotals.protein).toBeCloseTo(20);
		expect(result?.workoutTotals.calories).toBeCloseTo(150);
		expect(result?.linkedTotals.calories).toBeCloseTo(50);
		expect(result?.combinedTotals.calories).toBeCloseTo(200);
	});

	test("clamps negative totals to zero when workouts exceed intake", () => {
		const result = calculateNutritionTotals(
			buildParams({
				content: `#food Snack 200kcal
#workout Ride 500kcal`,
				getNutritionData: () => null,
			})
		);

		expect(result).not.toBeNull();
		expect(result?.combinedTotals.calories).toBeCloseTo(-300);
		expect(result?.clampedTotals.calories).toBe(0);
	});

	test("continues processing when data provider throws and reports the error", () => {
		const onReadError = jest.fn();
		const getNutritionData = jest.fn().mockImplementation(() => {
			throw new Error("cache down");
		});

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[apple]] 100g",
				getNutritionData,
				onReadError,
			})
		);

		expect(result).not.toBeNull();
		expect(onReadError).toHaveBeenCalledWith("apple", expect.any(Error));
		expect(result?.linkedTotals.calories).toBeUndefined();
		expect(result?.combinedTotals.calories).toBeUndefined();
	});
});
