import ExerciseEntryParser from "../ExerciseEntryParser";

describe("ExerciseEntryParser", () => {
	test("parses workout entries with wikilinks and weight", () => {
		const parser = new ExerciseEntryParser("workout");
		const entries = parser.parse("#workout [[Pec Fly]] 40kg 15-15-15");

		expect(entries).toHaveLength(1);
		expect(entries[0]).toEqual({
			name: "Pec Fly",
			sets: [15, 15, 15],
			weight: { value: 40, unit: "kg" },
			lineNumber: 1,
			rawText: "#workout [[Pec Fly]] 40kg 15-15-15",
		});
	});

	test("supports plain names and falls back to kg when unit missing", () => {
		const parser = new ExerciseEntryParser("workout");
		const entries = parser.parse("#workout Deadlift 120 5-5-5");

		expect(entries[0].name).toBe("Deadlift");
		expect(entries[0].weight).toEqual({ value: 120, unit: "kg" });
		expect(entries[0].sets).toEqual([5, 5, 5]);
	});

	test("ignores entries without valid sets", () => {
		const parser = new ExerciseEntryParser("workout");
		const entries = parser.parse("#workout Running 30kg reps");

		expect(entries).toHaveLength(0);
	});

	test("allows custom workout tag", () => {
		const parser = new ExerciseEntryParser("lift");
		const entries = parser.parse("#lift [[Bench Press]] 80kg 8-8-6");

		expect(entries[0].name).toBe("Bench Press");
	});
});
