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

	test("normalizes wikilink aliases (custom display names) to extract actual filename", () => {
		const getNutritionData = jest
			.fn()
			.mockReturnValueOnce({ calories: 100, protein: 10 })
			.mockReturnValueOnce({ calories: 80, carbs: 20 });

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[apple|Green Apple]] 150g\n#food [[banana|Ripe Banana]] 50g",
				getNutritionData,
			})
		);

		expect(getNutritionData).toHaveBeenNthCalledWith(1, "apple");
		expect(getNutritionData).toHaveBeenNthCalledWith(2, "banana");
		expect(result).not.toBeNull();
		expect(result?.linkedTotals.calories).toBeCloseTo(190);
		expect(result?.linkedTotals.protein).toBeCloseTo(15);
		expect(result?.linkedTotals.carbs).toBeCloseTo(10);
	});

	test("normalizes wikilink with heading and folder path", () => {
		const getNutritionData = jest.fn().mockReturnValue({ calories: 200 });

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[folder/subfolder/apple#Nutrition|Custom Name]] 100g",
				getNutritionData,
			})
		);

		expect(getNutritionData).toHaveBeenCalledWith("apple");
		expect(result).not.toBeNull();
		expect(result?.linkedTotals.calories).toBeCloseTo(200);
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

	test("calculates goal progress when goals are provided", () => {
		const getNutritionData = jest.fn().mockReturnValue({ calories: 100, protein: 20, fats: 10 });

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[meal]] 100g",
				getNutritionData,
				goals: {
					calories: 2000,
					protein: 150,
					fats: 70,
				},
			})
		);

		expect(result).not.toBeNull();
		expect(result?.goalProgress).toBeDefined();
		expect(result?.goalProgress?.calories).toEqual({
			remaining: 1900,
			percentConsumed: 5,
			percentRemaining: 95,
		});
		expect(result?.goalProgress?.protein).toEqual({
			remaining: 130,
			percentConsumed: 13,
			percentRemaining: 87,
		});
		expect(result?.goalProgress?.fats).toEqual({
			remaining: 60,
			percentConsumed: 14,
			percentRemaining: 86,
		});
	});

	test("calculates negative remaining when consumption exceeds goal", () => {
		const getNutritionData = jest.fn().mockReturnValue({ calories: 2500 });

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[meal]] 100g",
				getNutritionData,
				goals: {
					calories: 2000,
				},
			})
		);

		expect(result).not.toBeNull();
		expect(result?.goalProgress?.calories).toEqual({
			remaining: -500,
			percentConsumed: 125,
			percentRemaining: 0,
		});
	});

	test("calculates goal progress with workout subtraction", () => {
		const getNutritionData = jest.fn().mockReturnValue({ calories: 50 });

		const result = calculateNutritionTotals(
			buildParams({
				content: `#food Breakfast 500kcal
#workout Running 200kcal
#food [[snack]] 100g`,
				getNutritionData,
				goals: {
					calories: 2000,
				},
			})
		);

		expect(result).not.toBeNull();
		expect(result?.combinedTotals.calories).toBeCloseTo(350);
		expect(result?.clampedTotals.calories).toBeCloseTo(350);
		expect(result?.goalProgress?.calories).toEqual({
			remaining: 1650,
			percentConsumed: 18,
			percentRemaining: 83,
		});
	});

	test("handles zero goal gracefully", () => {
		const getNutritionData = jest.fn().mockReturnValue({ calories: 100 });

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[meal]] 100g",
				getNutritionData,
				goals: {
					calories: 0,
				},
			})
		);

		expect(result).not.toBeNull();
		expect(result?.goalProgress?.calories).toEqual({
			remaining: -100,
			percentConsumed: 0,
			percentRemaining: 0,
		});
	});

	test("does not include goal progress when goals are not provided", () => {
		const getNutritionData = jest.fn().mockReturnValue({ calories: 100 });

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[meal]] 100g",
				getNutritionData,
			})
		);

		expect(result).not.toBeNull();
		expect(result?.goalProgress).toBeUndefined();
	});

	test("only calculates progress for nutrients with defined goals", () => {
		const getNutritionData = jest.fn().mockReturnValue({ calories: 100, protein: 20, fats: 10 });

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[meal]] 100g",
				getNutritionData,
				goals: {
					calories: 2000,
				},
			})
		);

		expect(result).not.toBeNull();
		expect(result?.goalProgress?.calories).toBeDefined();
		expect(result?.goalProgress?.protein).toBeUndefined();
		expect(result?.goalProgress?.fats).toBeUndefined();
	});

	test("calculates remaining correctly when exactly at goal", () => {
		const getNutritionData = jest.fn().mockReturnValue({ calories: 2000 });

		const result = calculateNutritionTotals(
			buildParams({
				content: "#food [[meal]] 100g",
				getNutritionData,
				goals: {
					calories: 2000,
				},
			})
		);

		expect(result).not.toBeNull();
		expect(result?.goalProgress?.calories).toEqual({
			remaining: 0,
			percentConsumed: 100,
			percentRemaining: 0,
		});
	});

	test("derives workout calories from set-based entries with per-rep metadata", () => {
		const result = calculateNutritionTotals(
			buildParams({
				content: "#workout [[Pec Fly]] 40kg 15-15-10\n#food Lunch 300kcal",
				getNutritionData: () => null,
				getExerciseCaloriesPerRep: exerciseName => (exerciseName === "Pec Fly" ? 3 : null),
			})
		);

		expect(result).not.toBeNull();
		expect(result?.workoutTotals.calories).toBeCloseTo(120); // 40 reps * 3 kcal
		expect(result?.inlineTotals.calories).toBeCloseTo(180); // 300 - 120
	});

	test("ignores set-based workouts when no per-rep metadata is available", () => {
		const result = calculateNutritionTotals(
			buildParams({
				content: "#workout [[Unknown Move]] 10-10-10\n#food Snack 150kcal",
				getNutritionData: () => null,
			})
		);

		expect(result?.workoutTotals.calories).toBeUndefined();
		expect(result?.inlineTotals.calories).toBeCloseTo(150);
	});
});
