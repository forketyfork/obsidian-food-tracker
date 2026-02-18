import { SPECIAL_CHARS_REGEX, createInlineNutritionRegex, createLinkedFoodRegex, getUnitMultiplier } from "./constants";

export interface NutrientData {
	calories?: number;
	fats?: number;
	saturated_fats?: number;
	protein?: number;
	carbs?: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
	serving_size?: number;
}

export interface NutrientGoals {
	calories?: number;
	fats?: number;
	saturated_fats?: number;
	protein?: number;
	carbs?: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
}

export interface NutrientGoalProgress {
	remaining: number;
	percentConsumed: number;
	percentRemaining: number;
}

interface FoodEntry {
	filename: string;
	amount: number;
	unit: string;
}

interface InlineNutrientEntry {
	calories?: number;
	fats?: number;
	saturated_fats?: number;
	protein?: number;
	carbs?: number;
	sugar?: number;
	fiber?: number;
	sodium?: number;
}

export interface NutritionCalculationResult {
	linkedTotals: NutrientData;
	inlineTotals: NutrientData;
	workoutTotals: NutrientData;
	combinedTotals: NutrientData;
	clampedTotals: NutrientData;
	goalProgress?: Record<keyof Omit<NutrientData, "serving_size">, NutrientGoalProgress>;
}

export interface NutritionCalculationParams {
	content: string;
	foodTag?: string;
	escapedFoodTag?: boolean;
	workoutTag?: string;
	workoutTagEscaped?: boolean;
	getNutritionData: (filename: string) => NutrientData | null;
	onReadError?: (filename: string, error: unknown) => void;
	goals?: NutrientGoals;
}

export function calculateNutritionTotals(params: NutritionCalculationParams): NutritionCalculationResult | null {
	const {
		content,
		foodTag = "food",
		escapedFoodTag = false,
		workoutTag = "workout",
		workoutTagEscaped,
		getNutritionData,
		onReadError,
		goals,
	} = params;

	const safeContent = content ?? "";

	const handleReadError =
		onReadError ??
		((filename: string, error: unknown) => {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`Error reading nutrient data for ${filename}:`, message);
		});

	const escapedFood = escapedFoodTag ? foodTag : foodTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
	const trimmedWorkoutTag = workoutTag.trim();
	const hasWorkoutTag = trimmedWorkoutTag.length > 0;
	const workoutEscaped = workoutTagEscaped ?? escapedFoodTag;
	const escapedWorkout = hasWorkoutTag
		? workoutEscaped
			? trimmedWorkoutTag
			: trimmedWorkoutTag.replace(SPECIAL_CHARS_REGEX, "\\$&")
		: null;

	const foodEntries = parseFoodEntries(safeContent, escapedFood);
	const inlineEntries = parseInlineNutrientEntries(safeContent, escapedFood);
	const workoutEntries = escapedWorkout ? parseInlineNutrientEntries(safeContent, escapedWorkout) : [];

	if (foodEntries.length === 0 && inlineEntries.length === 0 && workoutEntries.length === 0) {
		return null;
	}

	const linkedTotals = calculateTotals(foodEntries, getNutritionData, handleReadError);
	const inlineTotals = calculateInlineTotals(inlineEntries);

	let workoutTotals: NutrientData = {};
	if (workoutEntries.length > 0) {
		const validWorkoutEntries = filterValidWorkoutEntries(workoutEntries);
		if (validWorkoutEntries.length > 0) {
			workoutTotals = calculateInlineTotals(validWorkoutEntries);
			if (Object.keys(workoutTotals).length > 0) {
				addNutrients(inlineTotals, workoutTotals, -1);
			}
		}
	}

	const combinedTotals = combineNutrients(linkedTotals, inlineTotals);
	const clampedTotals = clampNutrientsToZero(combinedTotals);

	const goalProgress = goals ? calculateGoalProgress(clampedTotals, goals) : undefined;

	return {
		linkedTotals,
		inlineTotals,
		workoutTotals,
		combinedTotals,
		clampedTotals,
		goalProgress,
	};
}

function parseFoodEntries(content: string, escapedFoodTag: string): FoodEntry[] {
	const entries: FoodEntry[] = [];
	const lines = content.split("\n");
	const entryRegex = createLinkedFoodRegex(escapedFoodTag);

	for (const line of lines) {
		const match = entryRegex.exec(line);
		if (match) {
			const rawFilename = match.groups?.wikiLink ?? match.groups?.markdownLink ?? match[1];
			const filename = normalizeFilename(rawFilename);
			if (!filename) {
				continue;
			}
			const amountString = match.groups?.amount ?? match[2];
			const unitMatch = match.groups?.unit ?? match[3];

			const amount = parseFloat(amountString);
			const unit = unitMatch.toLowerCase();

			entries.push({
				filename,
				amount,
				unit,
			});
		}
	}

	return entries;
}

export function normalizeFilename(raw: string): string | undefined {
	if (!raw) {
		return undefined;
	}

	const withoutAlias = raw.split("|")[0];
	const withoutHeading = withoutAlias.split("#")[0];
	const segments = withoutHeading.split("/");
	let filename = segments.pop()?.trim();

	if (!filename) {
		return undefined;
	}

	if (filename.toLowerCase().endsWith(".md")) {
		filename = filename.slice(0, -3);
	}

	try {
		filename = decodeURIComponent(filename.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
	} catch (error) {
		console.error("Failed to decode filename:", filename, error);
	}

	return filename;
}

function parseInlineNutrientEntries(content: string, escapedFoodTag: string): InlineNutrientEntry[] {
	const entries: InlineNutrientEntry[] = [];
	const lines = content.split("\n");
	const inlineRegex = createInlineNutritionRegex(escapedFoodTag);

	for (const line of lines) {
		const foodMatch = inlineRegex.exec(line);
		if (foodMatch) {
			const nutrientString = foodMatch[2];
			const nutrientData = parseNutrientString(nutrientString);
			if (Object.keys(nutrientData).length > 0) {
				entries.push(nutrientData);
			}
		}
	}

	return entries;
}

function parseNutrientString(nutrientString: string): InlineNutrientEntry {
	const nutrientData: InlineNutrientEntry = {};
	const nutrientRegex = /(-?\d+(?:\.\d+)?)\s*(kcal|fat|satfat|prot|carbs|sugar|fiber|sodium)/gi;

	const matches = nutrientString.matchAll(nutrientRegex);
	for (const match of matches) {
		const value = parseFloat(match[1]);
		const unit = match[2].toLowerCase();
		const key = nutrientKeyMap[unit];
		if (key) {
			nutrientData[key] = (nutrientData[key] ?? 0) + value;
		}
	}

	return nutrientData;
}

const nutrientKeyMap: Record<string, keyof InlineNutrientEntry> = {
	kcal: "calories",
	fat: "fats",
	satfat: "saturated_fats",
	prot: "protein",
	carbs: "carbs",
	sugar: "sugar",
	fiber: "fiber",
	sodium: "sodium",
};

function addNutrients(target: NutrientData, source: NutrientData, multiplier: number = 1): void {
	const keys = Object.keys(source) as Array<keyof NutrientData>;
	for (const key of keys) {
		if (source[key] !== undefined) {
			target[key] = (target[key] ?? 0) + source[key] * multiplier;
		}
	}
}

function calculateInlineTotals(entries: InlineNutrientEntry[]): NutrientData {
	const totals: NutrientData = {};
	for (const entry of entries) {
		addNutrients(totals, entry);
	}
	return totals;
}

function filterValidWorkoutEntries(entries: InlineNutrientEntry[]): InlineNutrientEntry[] {
	return entries.filter(entry => {
		const hasPositiveValues = Object.values(entry).some(value => value !== undefined && value > 0);
		const hasNoNegativeCalories = entry.calories === undefined || entry.calories >= 0;
		return hasPositiveValues && hasNoNegativeCalories;
	});
}

function combineNutrients(nutrients1: NutrientData, nutrients2: NutrientData): NutrientData {
	const combined: NutrientData = { ...nutrients1 };
	addNutrients(combined, nutrients2);
	return combined;
}

function clampNutrientsToZero(nutrients: NutrientData): NutrientData {
	const clamped: NutrientData = {};
	const keys = Object.keys(nutrients) as Array<keyof NutrientData>;
	for (const key of keys) {
		const value = nutrients[key];
		if (value !== undefined) {
			clamped[key] = Math.max(0, value);
		}
	}
	return clamped;
}

function calculateGoalProgress(
	consumed: NutrientData,
	goals: NutrientGoals
): Record<keyof Omit<NutrientData, "serving_size">, NutrientGoalProgress> {
	const progress = {} as Record<keyof Omit<NutrientData, "serving_size">, NutrientGoalProgress>;

	const nutrientKeys: Array<keyof Omit<NutrientData, "serving_size">> = [
		"calories",
		"fats",
		"saturated_fats",
		"protein",
		"carbs",
		"fiber",
		"sugar",
		"sodium",
	];

	for (const key of nutrientKeys) {
		const goal = goals[key];
		const consumedValue = consumed[key] ?? 0;

		if (goal !== undefined) {
			const remaining = goal - consumedValue;
			const percentConsumed = goal > 0 ? Math.round((consumedValue / goal) * 100) : 0;
			const percentRemaining = goal > 0 ? Math.max(0, Math.round((remaining / goal) * 100)) : 0;

			progress[key] = {
				remaining,
				percentConsumed,
				percentRemaining,
			};
		}
	}

	return progress;
}

function calculateTotals(
	entries: FoodEntry[],
	getNutritionData: (filename: string) => NutrientData | null,
	handleReadError: (filename: string, error: unknown) => void
): NutrientData {
	const totals: NutrientData = {};

	for (const entry of entries) {
		let nutrients: NutrientData | null = null;
		try {
			nutrients = getNutritionData(entry.filename);
		} catch (error) {
			handleReadError(entry.filename, error);
		}

		if (nutrients) {
			const multiplier = getUnitMultiplier(entry.amount, entry.unit, nutrients.serving_size);
			addNutrients(totals, nutrients, multiplier);
		}
	}

	return totals;
}
