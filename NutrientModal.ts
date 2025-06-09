import { App, Modal, Setting } from "obsidian";
import type FoodTrackerPlugin from "./FoodTrackerPlugin";

const INVALID_FILENAME_CHARS_REGEX = /[^a-zA-Z0-9]/g;

interface NutrientData {
	name: string;
	calories: number;
	fats: number;
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
	mainContainer: HTMLElement | null = null;
	formContainer: HTMLElement | null = null;
	nameInput: HTMLInputElement | null = null;
	searchButton: HTMLButtonElement | null = null;
	isSearching: boolean = false;

	constructor(app: App, plugin: FoodTrackerPlugin) {
		super(app);
		this.plugin = plugin;
		this.nutrientData = {
			name: "",
			calories: 0,
			fats: 0,
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

		// Apply initial modal styling
		this.modalEl.addClass("nutrient-modal");

		contentEl.createEl("h2", { text: "🍎 Add nutrient" });

		// Create main container for side-by-side layout
		this.mainContainer = contentEl.createDiv({ cls: "nutrient-modal-main" });
		this.formContainer = this.mainContainer.createDiv({ cls: "nutrient-form-container" });

		// Always create the search results container to maintain layout
		this.searchResultsEl = this.mainContainer.createDiv({ cls: "search-results-container" });
		this.searchResultsEl.hide();

		new Setting(this.formContainer)
			.setName("📝 Name")
			.addText(text => {
				this.nameInput = text.inputEl;
				text.setValue(this.nutrientData.name).onChange(value => {
					this.nutrientData.name = value;
				});
				// Add Enter key listener
				text.inputEl.addEventListener("keydown", e => {
					if (e.key === "Enter") {
						e.preventDefault();
						void this.searchOpenFoodFacts();
					}
				});
			})
			.addButton(button => {
				this.searchButton = button.buttonEl;
				this.searchButton.setAttribute("data-search-button", "true");
				return button
					.setButtonText("🔍 Search")
					.setTooltip("Search OpenFoodFacts database")
					.onClick(async () => {
						await this.searchOpenFoodFacts();
					});
			});

		new Setting(this.formContainer).setName("🔥 Calories").addText(text =>
			text.setValue(this.nutrientData.calories.toString()).onChange(value => {
				this.nutrientData.calories = parseFloat(value) || 0;
			})
		);

		new Setting(this.formContainer).setName("🥑 Fats (g)").addText(text =>
			text.setValue(this.nutrientData.fats.toString()).onChange(value => {
				this.nutrientData.fats = parseFloat(value) || 0;
			})
		);

		new Setting(this.formContainer).setName("🍞 Carbs (g)").addText(text =>
			text.setValue(this.nutrientData.carbs.toString()).onChange(value => {
				this.nutrientData.carbs = parseFloat(value) || 0;
			})
		);

		new Setting(this.formContainer).setName("🍯 Sugar (g)").addText(text =>
			text.setValue(this.nutrientData.sugar.toString()).onChange(value => {
				this.nutrientData.sugar = parseFloat(value) || 0;
			})
		);

		new Setting(this.formContainer).setName("🌾 Fiber (g)").addText(text =>
			text.setValue(this.nutrientData.fiber.toString()).onChange(value => {
				this.nutrientData.fiber = parseFloat(value) || 0;
			})
		);

		new Setting(this.formContainer).setName("🥩 Protein (g)").addText(text =>
			text.setValue(this.nutrientData.protein.toString()).onChange(value => {
				this.nutrientData.protein = parseFloat(value) || 0;
			})
		);

		new Setting(this.formContainer).setName("🧂 Sodium (mg)").addText(text =>
			text.setValue(this.nutrientData.sodium.toString()).onChange(value => {
				this.nutrientData.sodium = parseFloat(value) || 0;
			})
		);

		new Setting(this.formContainer)
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
			const fileName = `${this.nutrientData.name.replace(INVALID_FILENAME_CHARS_REGEX, "_")}.md`;
			const filePath = `${directory}/${fileName}`;

			// Ensure directory exists
			const folderExists = await this.app.vault.adapter.exists(directory);
			if (!folderExists) {
				await this.app.vault.createFolder(directory);
			}

			const content = `---
name: ${this.nutrientData.name}
calories: ${this.nutrientData.calories}
fats: ${this.nutrientData.fats}
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
		if (!this.nutrientData.name.trim() || this.isSearching) {
			return;
		}

		this.setSearchingState(true);

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
				this.searchResultsEl.show();
				this.modalEl.addClass("nutrient-modal-expanded");
			}
		} finally {
			this.setSearchingState(false);
		}
	}

	displaySearchResults() {
		if (!this.searchResultsEl) return;

		// Show the search results container and expand modal
		this.searchResultsEl.show();
		this.modalEl.addClass("nutrient-modal-expanded");

		this.searchResultsEl.empty();

		if (this.searchResults.length === 0) {
			this.searchResultsEl.createDiv({ text: "No results found.", cls: "search-no-results" });
			return;
		}

		const resultsContainer = this.searchResultsEl.createDiv({ cls: "search-results" });
		resultsContainer.createEl("h3", { text: "🔍 Search results from OpenFoodFacts:" });

		this.searchResults.forEach(product => {
			const productEl = resultsContainer.createDiv({ cls: "search-result-item" });

			// Make entire item clickable
			productEl.onclick = () => this.fillFromOpenFoodFacts(product);

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
		});
	}

	fillFromOpenFoodFacts(product: OpenFoodFactsProduct) {
		const nutriments = product.nutriments;

		this.nutrientData.name = product.product_name ?? this.nutrientData.name;
		this.nutrientData.calories = Number(nutriments["energy-kcal_100g"] ?? 0);
		this.nutrientData.fats = Number(nutriments["fat_100g"] ?? 0);
		this.nutrientData.carbs = Number(nutriments["carbohydrates_100g"] ?? 0);
		this.nutrientData.sugar = Number(nutriments["sugars_100g"] ?? 0);
		this.nutrientData.fiber = Number(nutriments["fiber_100g"] ?? 0);
		this.nutrientData.protein = Number(nutriments["proteins_100g"] ?? 0);
		this.nutrientData.sodium = Number(nutriments["sodium_100g"] ?? 0) * 1000; // Convert from g to mg

		// Collapse modal back to initial state
		this.collapseModal();

		// Update form field values without recreating the entire form
		this.updateFormValues();
	}

	private collapseModal() {
		// Hide search results and collapse modal
		if (this.searchResultsEl) {
			this.searchResultsEl.hide();
		}
		this.modalEl.removeClass("nutrient-modal-expanded");
	}

	private updateFormValues() {
		// Update name input
		if (this.nameInput) {
			this.nameInput.value = this.nutrientData.name;
		}

		// Update all other form inputs by finding them and setting their values
		if (this.formContainer) {
			const inputs = this.formContainer.querySelectorAll('input[type="text"]');
			const fields = ["calories", "fats", "carbs", "sugar", "fiber", "protein", "sodium"];

			inputs.forEach((input, index) => {
				if (index > 0 && index <= fields.length) {
					// Skip the name input (index 0)
					const field = fields[index - 1];
					(input as HTMLInputElement).value = this.nutrientData[field as keyof NutrientData]?.toString() || "0";
				}
			});
		}
	}

	private setSearchingState(searching: boolean) {
		this.isSearching = searching;
		if (this.searchButton) {
			this.searchButton.disabled = searching;
			this.searchButton.textContent = searching ? "⏳ Searching..." : "🔍 Search";
		}
	}
}
