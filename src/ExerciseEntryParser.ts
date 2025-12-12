import { SPECIAL_CHARS_REGEX } from "./constants";

export interface ExerciseEntry {
	name: string;
	sets: number[];
	weight?: {
		value: number;
		unit: string;
	};
	lineNumber: number;
	rawText: string;
}

/**
 * Lightweight parser for exercise entries in daily notes.
 *
 * Expected format: #exercise [[Exercise Name]] 40kg 15-15-15
 */
export default class ExerciseEntryParser {
	private exerciseTag: string;

	constructor(exerciseTag: string) {
		this.exerciseTag = exerciseTag.trim();
	}

	updateExerciseTag(newTag: string): void {
		this.exerciseTag = newTag.trim();
	}

	parse(content: string): ExerciseEntry[] {
		if (this.exerciseTag.length === 0) {
			return [];
		}

		const escapedTag = this.exerciseTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
		const regex = new RegExp(
			`^#${escapedTag}\\s+(?<name>\\[\\[[^\\]]+\\]\\]|[^\\d\\r\\n]+?)\\s+(?:(?<weight>\\d+(?:\\.\\d+)?)(?<unit>kg|kgs?|lb|lbs?)?\\s+)?(?<sets>\\d+(?:-\\d+)*)(?=\\s*$|\\s+[^\\s])`,
			"i"
		);

		return content
			.split(/\r?\n/)
			.map((line, index) => this.parseLine(line.trim(), index + 1, regex))
			.filter((entry): entry is ExerciseEntry => entry !== null);
	}

	private parseLine(line: string, lineNumber: number, regex: RegExp): ExerciseEntry | null {
		if (line.length === 0) {
			return null;
		}

		const match = line.match(regex);
		if (!match?.groups) {
			return null;
		}

		const sets = match.groups.sets
			.split("-")
			.map(value => Number.parseInt(value, 10))
			.filter(reps => !Number.isNaN(reps) && reps > 0);

		if (sets.length === 0) {
			return null;
		}

		const name = this.extractName(match.groups.name);
		const weight = this.parseWeight(match.groups.weight, match.groups.unit);

		return {
			name,
			sets,
			weight: weight ?? undefined,
			lineNumber,
			rawText: line,
		};
	}

	private extractName(rawName: string): string {
		const trimmedName = rawName.trim();
		if (trimmedName.startsWith("[[") && trimmedName.endsWith("]]")) {
			return trimmedName.slice(2, -2).trim();
		}
		return trimmedName;
	}

	private parseWeight(rawWeight?: string, unit?: string): ExerciseEntry["weight"] | null {
		if (!rawWeight) {
			return null;
		}

		const value = Number.parseFloat(rawWeight);
		if (Number.isNaN(value) || value <= 0) {
			return null;
		}

		const normalizedUnit = unit?.toLowerCase() ?? "";
		return {
			value,
			unit: normalizedUnit.length > 0 ? normalizedUnit : "kg",
		};
	}
}
