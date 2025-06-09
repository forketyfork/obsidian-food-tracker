import { App, TFile, TAbstractFile } from "obsidian";

interface NutrientData {
	calories?: number;
	fats?: number;
	protein?: number;
	carbs?: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
}

/**
 * Manages caching of nutrient files and their frontmatter data
 * Maintains efficient lookups for food names, filenames, and nutrition data
 */
export default class NutrientCache {
	private app: App;
	private nutrientDirectory: string;
	private cache: Map<string, string> = new Map(); // file path -> nutrient name
	private nameToFileMap: Map<string, string> = new Map(); // nutrient name -> file basename
	private nutritionDataCache: Map<string, NutrientData> = new Map(); // file basename -> nutrition data

	constructor(app: App, nutrientDirectory: string) {
		this.app = app;
		this.nutrientDirectory = nutrientDirectory;
	}

	initialize() {
		this.cache.clear();
		this.nameToFileMap.clear();
		this.nutritionDataCache.clear();

		try {
			const allMarkdownFiles = this.app.vault.getMarkdownFiles();
			const nutrientFiles = allMarkdownFiles.filter(file => file.path.startsWith(this.nutrientDirectory + "/"));

			for (const file of nutrientFiles) {
				this.processNutrientFile(file);
			}
		} catch (error) {
			console.error("Error initializing nutrient cache:", error);
		}
	}

	/**
	 * Processes a single nutrient file and updates all relevant caches
	 * Handles cleanup of old mappings when files are modified or renamed
	 */
	private processNutrientFile(file: TFile): void {
		const nutrientName = this.extractNutrientName(file);
		const nutritionData = this.extractNutritionData(file);

		if (nutrientName) {
			// Remove old mapping if it exists
			const oldNutrientName = this.cache.get(file.path);
			if (oldNutrientName && oldNutrientName !== nutrientName) {
				this.nameToFileMap.delete(oldNutrientName);
			}

			this.cache.set(file.path, nutrientName);
			this.nameToFileMap.set(nutrientName, file.basename);
			this.nutritionDataCache.set(file.basename, nutritionData);
		} else {
			// If nutrient name is null/undefined, remove from cache
			const oldNutrientName = this.cache.get(file.path);
			if (oldNutrientName) {
				this.nameToFileMap.delete(oldNutrientName);
			}
			this.cache.delete(file.path);
			this.nutritionDataCache.delete(file.basename);
		}
	}

	refresh() {
		this.initialize();
	}

	isNutrientFile(file: TAbstractFile): file is TFile {
		return file instanceof TFile && file.path.startsWith(this.nutrientDirectory + "/") && file.extension === "md";
	}

	updateCache(file: TFile, action: "create" | "delete" | "modify") {
		try {
			if (action === "delete") {
				const oldNutrientName = this.cache.get(file.path);
				if (oldNutrientName) {
					this.nameToFileMap.delete(oldNutrientName);
				}
				this.cache.delete(file.path);
				this.nutritionDataCache.delete(file.basename);
				return;
			}

			this.processNutrientFile(file);
		} catch (error) {
			console.error("Error updating nutrient cache:", error);
			this.refresh();
		}
	}

	handleMetadataChange(file: TFile): void {
		if (this.isNutrientFile(file)) {
			this.processNutrientFile(file);
		}
	}

	private extractNutrientName(file: TFile): string | null {
		try {
			const parsedFrontMatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (parsedFrontMatter?.name) {
				return parsedFrontMatter.name as string;
			}
		} catch (error) {
			console.error("Error extracting nutrient name from file:", file.path, error);
		}
		return null;
	}

	private extractNutritionData(file: TFile): NutrientData {
		try {
			const cache = this.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter;

			if (!frontmatter) {
				return {};
			}

			return {
				calories: this.parseNumber(frontmatter.calories),
				fats: this.parseNumber(frontmatter.fats),
				protein: this.parseNumber(frontmatter.protein),
				carbs: this.parseNumber(frontmatter.carbs ?? frontmatter.carbohydrates),
				fiber: this.parseNumber(frontmatter.fiber),
				sugar: this.parseNumber(frontmatter.sugar),
				sodium: this.parseNumber(frontmatter.sodium),
			};
		} catch (error) {
			console.error(`Error extracting nutrition data from ${file.path}:`, error);
			return {};
		}
	}

	private parseNumber(value: unknown): number {
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const parsed = parseFloat(value);
			return isNaN(parsed) ? 0 : parsed;
		}
		return 0;
	}

	getNutrientNames(): string[] {
		return Array.from(this.cache.values()).sort();
	}

	getFileNameFromNutrientName(nutrientName: string): string | null {
		return this.nameToFileMap.get(nutrientName) ?? null;
	}

	getNutritionData(filename: string): NutrientData | null {
		return this.nutritionDataCache.get(filename) ?? null;
	}

	updateNutrientDirectory(newDirectory: string) {
		this.nutrientDirectory = newDirectory;
	}
}
