import { App, Modal, Setting } from "obsidian";
import type FoodTrackerPlugin from "./FoodTrackerPlugin";

interface NutrientData {
	name: string;
	calories: number;
	totalFats: number;
	saturatedFats: number;
	unsaturatedFats: number;
	omega3Fats: number;
	carbs: number;
	sugar: number;
	fiber: number;
	protein: number;
	sodium: number;
}

interface OpenFoodFactsProduct {
	id: string;
	product_name: string;
	brands?: string;
	categories?: string;
	quantity?: string;
	nutriments: {
		"energy-kcal_100g"?: number;
		fat_100g?: number;
		"saturated-fat_100g"?: number;
		carbohydrates_100g?: number;
		sugars_100g?: number;
		fiber_100g?: number;
		proteins_100g?: number;
		sodium_100g?: number;
	};
}

interface OpenFoodFactsSearchResponse {
	products?: OpenFoodFactsProduct[];
	[key: string]: unknown;
}

export default class NutrientModal extends Modal {
	plugin: FoodTrackerPlugin;
	nutrientData: NutrientData;
	searchResults: OpenFoodFactsProduct[] = [];
	searchResultsEl: HTMLElement | null = null;

	constructor(app: App, plugin: FoodTrackerPlugin) {
		super(app);
		this.plugin = plugin;
		this.nutrientData = {
			name: "",
			calories: 0,
			totalFats: 0,
			saturatedFats: 0,
			unsaturatedFats: 0,
			omega3Fats: 0,
			carbs: 0,
			sugar: 0,
			fiber: 0,
			protein: 0,
			sodium: 0,
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "🍎 Add nutrient" });

		new Setting(contentEl)
			.setName("📝 Name")
			.setDesc("Enter the nutrient name")
			.addText(text =>
				text.setValue(this.nutrientData.name).onChange(value => {
					this.nutrientData.name = value;
				})
			)
			.addButton(button =>
				button
					.setButtonText("🔍 Search")
					.setTooltip("Search OpenFoodFacts database")
					.onClick(async () => {
						await this.searchOpenFoodFacts();
					})
			);

		// Container for search results
		this.searchResultsEl = contentEl.createDiv({ cls: "search-results-container" });

		new Setting(contentEl).setName("🔥 Calories").addText(text =>
			text.setValue(this.nutrientData.calories.toString()).onChange(value => {
				this.nutrientData.calories = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl).setName("🥑 Total fats (g)").addText(text =>
			text.setValue(this.nutrientData.totalFats.toString()).onChange(value => {
				this.nutrientData.totalFats = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl).setName("🧈 Saturated fats (g)").addText(text =>
			text.setValue(this.nutrientData.saturatedFats.toString()).onChange(value => {
				this.nutrientData.saturatedFats = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl).setName("🌿 Unsaturated fats (g)").addText(text =>
			text.setValue(this.nutrientData.unsaturatedFats.toString()).onChange(value => {
				this.nutrientData.unsaturatedFats = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl).setName("🐟 Omega-3 fats (g)").addText(text =>
			text.setValue(this.nutrientData.omega3Fats.toString()).onChange(value => {
				this.nutrientData.omega3Fats = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl).setName("🍞 Carbs (g)").addText(text =>
			text.setValue(this.nutrientData.carbs.toString()).onChange(value => {
				this.nutrientData.carbs = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl).setName("🍯 Sugar (g)").addText(text =>
			text.setValue(this.nutrientData.sugar.toString()).onChange(value => {
				this.nutrientData.sugar = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl).setName("🌾 Fiber (g)").addText(text =>
			text.setValue(this.nutrientData.fiber.toString()).onChange(value => {
				this.nutrientData.fiber = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl).setName("🥩 Protein (g)").addText(text =>
			text.setValue(this.nutrientData.protein.toString()).onChange(value => {
				this.nutrientData.protein = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl).setName("🧂 Sodium (mg)").addText(text =>
			text.setValue(this.nutrientData.sodium.toString()).onChange(value => {
				this.nutrientData.sodium = parseFloat(value) || 0;
			})
		);

		new Setting(contentEl)
			.addButton(button =>
				button
					.setButtonText("Create")
					.setCta()
					.onClick(async () => {
						await this.createNutrientFile();
						this.close();
					})
			)
			.addButton(button =>
				button.setButtonText("Cancel").onClick(() => {
					this.close();
				})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	async createNutrientFile() {
		if (!this.nutrientData.name.trim()) {
			return;
		}

		try {
			const directory = this.plugin.settings.nutrientDirectory;
			const fileName = `${this.nutrientData.name.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
			const filePath = `${directory}/${fileName}`;

			// Ensure directory exists
			const folderExists = await this.app.vault.adapter.exists(directory);
			if (!folderExists) {
				await this.app.vault.createFolder(directory);
			}

			const content = `---
name: ${this.nutrientData.name}
calories: ${this.nutrientData.calories}
totalFats: ${this.nutrientData.totalFats}
saturatedFats: ${this.nutrientData.saturatedFats}
unsaturatedFats: ${this.nutrientData.unsaturatedFats}
omega3Fats: ${this.nutrientData.omega3Fats}
carbs: ${this.nutrientData.carbs}
sugar: ${this.nutrientData.sugar}
fiber: ${this.nutrientData.fiber}
protein: ${this.nutrientData.protein}
sodium: ${this.nutrientData.sodium}
---

`;

			await this.app.vault.create(filePath, content);
		} catch (error) {
			console.error("Error creating nutrient file:", error);
		}
	}

	async searchOpenFoodFacts() {
		if (!this.nutrientData.name.trim()) {
			return;
		}

		try {
			const searchTerm = encodeURIComponent(this.nutrientData.name.trim());
			const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${searchTerm}&search_simple=1&action=process&json=1?page_size=5`;

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as OpenFoodFactsSearchResponse;

			// Handle different response formats and limit to 5 results
			if (data.products && Array.isArray(data.products)) {
				this.searchResults = data.products.slice(0, 5);
			} else if (Array.isArray(data)) {
				this.searchResults = (data as OpenFoodFactsProduct[]).slice(0, 5);
			} else {
				console.error("Unexpected response format from OpenFoodFacts API");
				this.searchResults = [];
			}

			this.displaySearchResults();
		} catch (error) {
			console.error("Error searching OpenFoodFacts:", error);
			if (this.searchResultsEl) {
				this.searchResultsEl.innerHTML = `<div class="search-error">Search failed. Please check your internet connection and try again.</div>`;
			}
		}
	}

	displaySearchResults() {
		if (!this.searchResultsEl) return;

		this.searchResultsEl.empty();

		if (this.searchResults.length === 0) {
			this.searchResultsEl.createDiv({ text: "No results found.", cls: "search-no-results" });
			return;
		}

		const resultsContainer = this.searchResultsEl.createDiv({ cls: "search-results" });
		resultsContainer.createEl("h3", { text: "🔍 Search results from OpenFoodFacts:" });

		this.searchResults.forEach(product => {
			const productEl = resultsContainer.createDiv({ cls: "search-result-item" });

			const productName = productEl.createDiv({ cls: "product-name" });
			productName.textContent = product.product_name ?? "Unknown product";

			// Add brand and category information
			const productInfo = productEl.createDiv({ cls: "product-info" });
			const brandText = product.brands ? `Brand: ${product.brands}` : "";
			const categoryText = product.categories ? `Category: ${product.categories.split(",")[0]}` : "";
			const quantityText = product.quantity ? `Size: ${product.quantity}` : "";

			const infoItems = [brandText, categoryText, quantityText].filter(item => item);
			if (infoItems.length > 0) {
				productInfo.textContent = infoItems.join(" • ");
			}

			const nutritionInfo = productEl.createDiv({ cls: "nutrition-preview" });
			const nutriments = product.nutriments;

			const calories = Number(nutriments["energy-kcal_100g"] ?? 0);
			const carbs = Number(nutriments["carbohydrates_100g"] ?? 0);
			const protein = Number(nutriments["proteins_100g"] ?? 0);
			const fat = Number(nutriments["fat_100g"] ?? 0);

			nutritionInfo.textContent = `Calories: ${calories.toFixed(1)}, Carbs: ${carbs.toFixed(1)}g, Protein: ${protein.toFixed(1)}g, Fat: ${fat.toFixed(1)}g (per 100g)`;

			const selectButton = productEl.createEl("button", { text: "Use this product", cls: "mod-cta" });
			selectButton.onclick = () => this.fillFromOpenFoodFacts(product);
		});
	}

	fillFromOpenFoodFacts(product: OpenFoodFactsProduct) {
		const nutriments = product.nutriments;

		this.nutrientData.name = product.product_name ?? this.nutrientData.name;
		this.nutrientData.calories = Number(nutriments["energy-kcal_100g"] ?? 0);
		this.nutrientData.totalFats = Number(nutriments["fat_100g"] ?? 0);
		this.nutrientData.saturatedFats = Number(nutriments["saturated-fat_100g"] ?? 0);
		this.nutrientData.carbs = Number(nutriments["carbohydrates_100g"] ?? 0);
		this.nutrientData.sugar = Number(nutriments["sugars_100g"] ?? 0);
		this.nutrientData.fiber = Number(nutriments["fiber_100g"] ?? 0);
		this.nutrientData.protein = Number(nutriments["proteins_100g"] ?? 0);
		this.nutrientData.sodium = Number(nutriments["sodium_100g"] ?? 0) * 1000; // Convert from g to mg

		// Clear search results
		if (this.searchResultsEl) {
			this.searchResultsEl.empty();
		}

		// Recreate the form to update all field values
		this.onOpen();
	}
}
