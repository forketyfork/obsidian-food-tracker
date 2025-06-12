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
	// Allow leading whitespace for indented goals
	const goalsRegex = /^\s*(\w+):\s*(\d+(?:\.\d+)?)/;
	const match = goalsRegex.exec(text);

	if (match) {
		// match[1] is the key, e.g., "calories"
		// match[2] is the value, e.g., "2000"
		// Calculate position more declaratively using capture group lengths
		const prefix = match[0].substring(0, match[0].length - match[2].length);
		const valueStart = lineStart + match.index + prefix.length;
		const valueEnd = valueStart + match[2].length;

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
