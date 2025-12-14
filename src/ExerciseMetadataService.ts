import { App } from "obsidian";

const CALORIES_PER_REP_KEYS = ["kcal_per_rep", "calories_per_rep"];

export default class ExerciseMetadataService {
	private app: App;
	private cache: Map<string, number | null> = new Map();

	constructor(app: App) {
		this.app = app;
	}

	getCaloriesPerRep(exerciseName: string, sourcePath?: string): number | null {
		const normalizedName = exerciseName.trim();
		if (normalizedName.length === 0) {
			return null;
		}

		const cacheKey = `${normalizedName}::${sourcePath ?? ""}`;
		if (this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey) ?? null;
		}

		try {
			const file = this.app.metadataCache.getFirstLinkpathDest(normalizedName, sourcePath ?? "");
			if (!file) {
				this.cache.set(cacheKey, null);
				return null;
			}

			const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!frontmatter) {
				this.cache.set(cacheKey, null);
				return null;
			}

			const caloriesPerRep = this.extractCaloriesPerRep(frontmatter);
			this.cache.set(cacheKey, caloriesPerRep);
			return caloriesPerRep;
		} catch (error) {
			console.error(`Error resolving exercise calories for ${normalizedName}:`, error);
			this.cache.set(cacheKey, null);
			return null;
		}
	}

	clear(): void {
		this.cache.clear();
	}

	private extractCaloriesPerRep(frontmatter: Record<string, unknown>): number | null {
		for (const key of CALORIES_PER_REP_KEYS) {
			const value = frontmatter[key];
			const parsed = this.parseCaloriesPerRep(value);
			if (parsed !== null) {
				return parsed;
			}
		}
		return null;
	}

	private parseCaloriesPerRep(value: unknown): number | null {
		if (value === null || value === undefined) {
			return null;
		}

		const numericValue =
			typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : null;

		if (numericValue === null) {
			return null;
		}
		if (Number.isNaN(numericValue) || numericValue <= 0) {
			return null;
		}
		return numericValue;
	}
}
