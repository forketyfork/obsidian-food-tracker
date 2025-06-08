import { App, TFile, TAbstractFile } from "obsidian";

export default class NutrientCache {
	private app: App;
	private nutrientDirectory: string;
	private cache: Map<string, string> = new Map();
	private nameToFileMap: Map<string, string> = new Map();

	constructor(app: App, nutrientDirectory: string) {
		this.app = app;
		this.nutrientDirectory = nutrientDirectory;
	}

	initialize() {
		this.cache.clear();
		this.nameToFileMap.clear();

		try {
			const allMarkdownFiles = this.app.vault.getMarkdownFiles();
			const nutrientFiles = allMarkdownFiles.filter(file => file.path.startsWith(this.nutrientDirectory + "/"));

			for (const file of nutrientFiles) {
				const nutrientName = this.extractNutrientName(file);
				if (nutrientName) {
					this.cache.set(file.path, nutrientName);
					this.nameToFileMap.set(nutrientName, file.basename);
				}
			}
		} catch (error) {
			console.error("Error initializing nutrient cache:", error);
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
				return;
			}

			const nutrientName = this.extractNutrientName(file);
			if (nutrientName) {
				// Remove old mapping if it exists
				const oldNutrientName = this.cache.get(file.path);
				if (oldNutrientName && oldNutrientName !== nutrientName) {
					this.nameToFileMap.delete(oldNutrientName);
				}

				this.cache.set(file.path, nutrientName);
				this.nameToFileMap.set(nutrientName, file.basename);
			} else {
				// If nutrient name is null/undefined, remove from cache
				const oldNutrientName = this.cache.get(file.path);
				if (oldNutrientName) {
					this.nameToFileMap.delete(oldNutrientName);
				}
				this.cache.delete(file.path);
			}
		} catch (error) {
			console.error("Error updating nutrient cache:", error);
			this.refresh();
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

	getNutrientNames(): string[] {
		return Array.from(this.cache.values()).sort();
	}

	getFileNameFromNutrientName(nutrientName: string): string | null {
		return this.nameToFileMap.get(nutrientName) ?? null;
	}

	updateNutrientDirectory(newDirectory: string) {
		this.nutrientDirectory = newDirectory;
	}
}
