export interface GoalsHighlightRange {
	start: number;
	end: number;
	type: "value";
}

/**
 * Extracts highlight ranges from text content for goals files
 * This is a pure function with no Obsidian dependencies for easy testing
 */
export function extractGoalsHighlightRanges(text: string, lineStart: number): GoalsHighlightRange[] {
	const ranges: GoalsHighlightRange[] = [];

	// Match pattern: "key: value" where value is a number (with optional decimal)
	const goalsRegex = /^(\w+):\s*(\d+(?:\.\d+)?)/;
	const match = goalsRegex.exec(text);

	if (match?.index !== undefined) {
		const valueText = match[2];
		const valueStart = lineStart + match.index + match[0].indexOf(valueText);
		const valueEnd = valueStart + valueText.length;

		ranges.push({
			start: valueStart,
			end: valueEnd,
			type: "value",
		});
	}

	return ranges;
}

/**
 * Processes multiple lines of text and extracts all highlight ranges for goals
 */
export function extractMultilineGoalsHighlightRanges(text: string, startOffset: number): GoalsHighlightRange[] {
	const ranges: GoalsHighlightRange[] = [];
	const lines = text.split("\n");
	let lineStart = startOffset;

	for (const line of lines) {
		const lineRanges = extractGoalsHighlightRanges(line, lineStart);
		ranges.push(...lineRanges);
		lineStart += line.length + 1; // +1 for newline
	}

	return ranges;
}
