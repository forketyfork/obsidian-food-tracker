import { App, TFile } from "obsidian";
import { NutrientData, calculateNutritionTotals } from "./NutritionCalculator";
import NutrientCache from "./NutrientCache";
import { SettingsService } from "./SettingsService";
import GoalsService from "./GoalsService";
import DailyNoteLocator from "./DailyNoteLocator";

export const FRONTMATTER_PREFIX = "ft-";

export const FRONTMATTER_KEYS = {
	calories: `${FRONTMATTER_PREFIX}calories`,
	fats: `${FRONTMATTER_PREFIX}fats`,
	saturated_fats: `${FRONTMATTER_PREFIX}saturated_fats`,
	protein: `${FRONTMATTER_PREFIX}protein`,
	carbs: `${FRONTMATTER_PREFIX}carbs`,
	fiber: `${FRONTMATTER_PREFIX}fiber`,
	sugar: `${FRONTMATTER_PREFIX}sugar`,
	sodium: `${FRONTMATTER_PREFIX}sodium`,
} as const;

export type FrontmatterKey = keyof typeof FRONTMATTER_KEYS;

export interface FrontmatterTotals {
	calories?: number;
	fats?: number;
	saturated_fats?: number;
	protein?: number;
	carbs?: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
}

export function extractFrontmatterTotals(frontmatter: Record<string, unknown>): FrontmatterTotals | null {
	const totals: FrontmatterTotals = {};
	let hasAnyValue = false;

	for (const [key, frontmatterKey] of Object.entries(FRONTMATTER_KEYS)) {
		const value = frontmatter[frontmatterKey];
		if (value !== undefined && value !== null) {
			let numValue: number;
			if (typeof value === "number") {
				numValue = value;
			} else if (typeof value === "string") {
				numValue = parseFloat(value);
			} else {
				continue;
			}
			if (!isNaN(numValue)) {
				totals[key as FrontmatterKey] = numValue;
				hasAnyValue = true;
			}
		}
	}

	return hasAnyValue ? totals : null;
}

export function nutrientDataToFrontmatterTotals(data: NutrientData): FrontmatterTotals {
	const totals: FrontmatterTotals = {};

	if (data.calories !== undefined) totals.calories = Math.round(data.calories);
	if (data.fats !== undefined) totals.fats = Math.round(data.fats * 10) / 10;
	if (data.saturated_fats !== undefined) totals.saturated_fats = Math.round(data.saturated_fats * 10) / 10;
	if (data.protein !== undefined) totals.protein = Math.round(data.protein * 10) / 10;
	if (data.carbs !== undefined) totals.carbs = Math.round(data.carbs * 10) / 10;
	if (data.fiber !== undefined) totals.fiber = Math.round(data.fiber * 10) / 10;
	if (data.sugar !== undefined) totals.sugar = Math.round(data.sugar * 10) / 10;
	if (data.sodium !== undefined) totals.sodium = Math.round(data.sodium * 10) / 10;

	return totals;
}

export default class FrontmatterTotalsService {
	private app: App;
	private nutrientCache: NutrientCache;
	private settingsService: SettingsService;
	private goalsService: GoalsService;
	private dailyNoteLocator: DailyNoteLocator;
	private pendingUpdates: Map<string, NodeJS.Timeout> = new Map();
	private filesBeingWritten: Set<string> = new Set();
	private debounceMs = 500;

	constructor(app: App, nutrientCache: NutrientCache, settingsService: SettingsService, goalsService: GoalsService) {
		this.app = app;
		this.nutrientCache = nutrientCache;
		this.settingsService = settingsService;
		this.goalsService = goalsService;
		this.dailyNoteLocator = new DailyNoteLocator(settingsService);
	}

	isDailyNote(file: TFile): boolean {
		if (file.extension.toLowerCase() !== "md") {
			return false;
		}
		return this.dailyNoteLocator.match(file) !== null;
	}

	updateFrontmatterTotals(file: TFile): void {
		if (!this.isDailyNote(file)) {
			return;
		}

		if (this.filesBeingWritten.has(file.path)) {
			return;
		}

		const existingTimeout = this.pendingUpdates.get(file.path);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		const timeout = setTimeout(() => {
			this.pendingUpdates.delete(file.path);
			void this.performUpdate(file);
		}, this.debounceMs);

		this.pendingUpdates.set(file.path, timeout);
	}

	private async performUpdate(file: TFile): Promise<void> {
		try {
			const content = await this.app.vault.cachedRead(file);
			const result = calculateNutritionTotals({
				content,
				foodTag: this.settingsService.currentEscapedFoodTag,
				escapedFoodTag: true,
				workoutTag: this.settingsService.currentEscapedWorkoutTag,
				workoutTagEscaped: true,
				getNutritionData: (filename: string) => this.nutrientCache.getNutritionData(filename),
				goals: this.goalsService.currentGoals,
			});

			this.filesBeingWritten.add(file.path);
			try {
				await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
					this.updateFrontmatterValues(frontmatter, result?.combinedTotals ?? null);
				});
			} finally {
				this.filesBeingWritten.delete(file.path);
			}
		} catch (error) {
			console.error(`Error updating frontmatter totals for ${file.path}:`, error);
		}
	}

	private updateFrontmatterValues(frontmatter: Record<string, unknown>, totals: NutrientData | null): void {
		if (!totals || Object.keys(totals).length === 0) {
			for (const frontmatterKey of Object.values(FRONTMATTER_KEYS)) {
				delete frontmatter[frontmatterKey];
			}
			return;
		}

		const formattedTotals = nutrientDataToFrontmatterTotals(totals);

		for (const [key, frontmatterKey] of Object.entries(FRONTMATTER_KEYS)) {
			const value = formattedTotals[key as FrontmatterKey];
			if (value !== undefined && (value !== 0 || key === "calories")) {
				frontmatter[frontmatterKey] = value;
			} else {
				delete frontmatter[frontmatterKey];
			}
		}
	}

	cancelPendingUpdates(): void {
		for (const timeout of this.pendingUpdates.values()) {
			clearTimeout(timeout);
		}
		this.pendingUpdates.clear();
	}

	updateNotesReferencingNutrient(nutrientBasename: string): void {
		const files = this.app.vault.getMarkdownFiles();
		const dailyNotes = files.filter(file => this.isDailyNote(file));
		const normalizedNutrient = nutrientBasename.toLowerCase().replace(/\.md$/, "");

		for (const file of dailyNotes) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.links) continue;

			const referencesNutrient = cache.links.some(link => {
				const linkBasename = link.link
					.split("/")
					.pop()
					?.split("#")[0]
					?.split("|")[0]
					?.toLowerCase()
					.replace(/\.md$/, "");
				return linkBasename === normalizedNutrient;
			});

			if (referencesNutrient) {
				this.updateFrontmatterTotals(file);
			}
		}
	}
}
