import { extractGoalsHighlightRanges, extractMultilineGoalsHighlightRanges } from "../GoalsHighlightCore";

describe("GoalsHighlightCore", () => {
	describe("extractGoalsHighlightRanges", () => {
		test("highlights single nutrition goal value", () => {
			const text = "calories: 2000";
			const lineStart = 0;
			const ranges = extractGoalsHighlightRanges(text, lineStart);

			expect(ranges).toHaveLength(1);
			expect(ranges[0]).toEqual({
				start: 10,
				end: 14,
				type: "value",
			});
		});

		test("highlights decimal nutrition goal value", () => {
			const text = "fats: 70.5";
			const lineStart = 0;
			const ranges = extractGoalsHighlightRanges(text, lineStart);

			expect(ranges).toHaveLength(1);
			expect(ranges[0]).toEqual({
				start: 6,
				end: 10,
				type: "value",
			});
		});

		test("handles goals with extra spaces", () => {
			const text = "protein:   120";
			const lineStart = 0;
			const ranges = extractGoalsHighlightRanges(text, lineStart);

			expect(ranges).toHaveLength(1);
			expect(ranges[0]).toEqual({
				start: 11,
				end: 14,
				type: "value",
			});
		});

		test("handles offset line start", () => {
			const text = "carbs: 250";
			const lineStart = 100;
			const ranges = extractGoalsHighlightRanges(text, lineStart);

			expect(ranges).toHaveLength(1);
			expect(ranges[0]).toEqual({
				start: 107,
				end: 110,
				type: "value",
			});
		});

		test("returns empty array for non-matching text", () => {
			const text = "This is not a goal";
			const lineStart = 0;
			const ranges = extractGoalsHighlightRanges(text, lineStart);

			expect(ranges).toHaveLength(0);
		});

		test("returns empty array for invalid goal format", () => {
			const text = "calories: invalid";
			const lineStart = 0;
			const ranges = extractGoalsHighlightRanges(text, lineStart);

			expect(ranges).toHaveLength(0);
		});

		test("handles goal with no spaces around colon", () => {
			const text = "fiber:25";
			const lineStart = 0;
			const ranges = extractGoalsHighlightRanges(text, lineStart);

			expect(ranges).toHaveLength(1);
			expect(ranges[0]).toEqual({
				start: 6,
				end: 8,
				type: "value",
			});
		});
	});

	describe("extractMultilineGoalsHighlightRanges", () => {
		test("highlights multiple goal values across lines", () => {
			const text = `calories: 2000
fats: 70
protein: 120
carbs: 250`;
			const startOffset = 0;
			const ranges = extractMultilineGoalsHighlightRanges(text, startOffset);

			expect(ranges).toHaveLength(4);

			// Check calories value
			expect(ranges[0]).toEqual({
				start: 10,
				end: 14,
				type: "value",
			});

			// Check fats value (after "calories: 2000\n" = 15 chars)
			expect(ranges[1]).toEqual({
				start: 21,
				end: 23,
				type: "value",
			});

			// Check protein value (after "calories: 2000\nfats: 70\n" = 24 chars)
			expect(ranges[2]).toEqual({
				start: 33,
				end: 36,
				type: "value",
			});

			// Check carbs value (after "calories: 2000\nfats: 70\nprotein: 120\n" = 37 chars)
			expect(ranges[3]).toEqual({
				start: 44,
				end: 47,
				type: "value",
			});
		});

		test("handles mixed valid and invalid lines", () => {
			const text = `calories: 2000
This is a comment
fats: 70.5
another comment: not-a-number
protein: 120`;
			const startOffset = 0;
			const ranges = extractMultilineGoalsHighlightRanges(text, startOffset);

			expect(ranges).toHaveLength(3);

			// Should only highlight the valid goal values
			expect(ranges[0].start).toBe(10); // calories
			// Calculate: "calories: 2000\n" (15) + "This is a comment\n" (18) + "fats: " (6) = 39
			expect(ranges[1].start).toBe(39); // fats
			// Calculate: 39 + "70.5\n" (5) + "another comment: not-a-number\n" (30) + "protein: " (9) = 83
			expect(ranges[2].start).toBe(83); // protein
		});

		test("handles empty lines and whitespace", () => {
			const text = `calories: 2000

fats: 70

protein: 120`;
			const startOffset = 0;
			const ranges = extractMultilineGoalsHighlightRanges(text, startOffset);

			expect(ranges).toHaveLength(3);
		});

		test("handles offset start position", () => {
			const text = `calories: 2000
fats: 70`;
			const startOffset = 100;
			const ranges = extractMultilineGoalsHighlightRanges(text, startOffset);

			expect(ranges).toHaveLength(2);
			expect(ranges[0].start).toBe(110); // 100 + 10
			expect(ranges[1].start).toBe(121); // 100 + 21
		});
	});
});
