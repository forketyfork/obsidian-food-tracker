import { App, Modal, Setting, Notice, normalizePath, requestUrl } from "obsidian";
import type FoodTrackerPlugin from "./FoodTrackerPlugin";
import { INVALID_FILENAME_CHARS_REGEX, convertGermanUmlauts } from "./constants";

interface NutrientData {
	name: string;
	calories: number;
	fats: number;
	saturated_fats: number;
	carbs: number;
	sugar: number;
	fiber: number;
	protein: number;
	sodium: number;
	serving_size: number;
}

type NutrientField = {
	key: keyof Omit<NutrientData, "name">;
	name: string;
	unit: string;
};

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

/**
 * Modal dialog for adding new nutrient files with OpenFoodFacts integration
 * Allows manual entry or automatic population from online food database
 */
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
			saturated_fats: 0,
			carbs: 0,
			sugar: 0,
			fiber: 0,
			protein: 0,
			sodium: 0,
			serving_size: 100,
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Apply initial modal styling
		this.modalEl.addClass("food-tracker-nutrient-modal");

		// Create main container for side-by-side layout
		this.mainContainer = contentEl.createDiv({ cls: "food-tracker-nutrient-modal-main" });
		this.formContainer = this.mainContainer.createDiv({ cls: "food-tracker-nutrient-form-container" });
		this.formContainer.appendChild(contentEl.createEl("h2", { text: "🍎 Add nutrient" }));

		// Always create the search results container to maintain layout
		this.searchResultsEl = this.mainContainer.createDiv({ cls: "food-tracker-search-results-container" });
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
				this.searchButton.addClass("food-tracker-search-button");
				return button
					.setButtonText("🔍 Search")
					.setTooltip("Search OpenFoodFacts database")
					.onClick(async () => {
						await this.searchOpenFoodFacts();
					});
			});

		const nutrientFields: NutrientField[] = [
			{ key: "calories", name: "🔥 Calories", unit: "" },
			{ key: "fats", name: "🥑 Fats", unit: "g" },
			{ key: "saturated_fats", name: "🧈 Saturated fats", unit: "g" },
			{ key: "carbs", name: "🍞 Carbs", unit: "g" },
			{ key: "sugar", name: "🍯 Sugar", unit: "g" },
			{ key: "fiber", name: "🌾 Fiber", unit: "g" },
			{ key: "protein", name: "🥩 Protein", unit: "g" },
			{ key: "sodium", name: "🧂 Sodium", unit: "mg" },
			{ key: "serving_size", name: "🍌 Serving size", unit: "g" },
		];

		if (!this.formContainer) return;

		nutrientFields.forEach(field => {
			const displayName = field.unit ? `${field.name} (${field.unit})` : field.name;
			new Setting(this.formContainer!).setName(displayName).addText(text => {
				text.inputEl.setAttribute("data-nutrient-key", field.key);
				text.setValue(this.nutrientData[field.key].toString()).onChange(value => {
					this.nutrientData[field.key] = parseFloat(value) || 0;
				});
			});
		});

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

		if (this.nutrientData.serving_size <= 0) {
			new Notice("Serving size must be a positive number", 5000);
			return;
		}

		try {
			const directory = this.plugin.settings.nutrientDirectory;
			const fileName = `${convertGermanUmlauts(this.nutrientData.name).replace(INVALID_FILENAME_CHARS_REGEX, "_")}.md`;
			const filePath = normalizePath(`${directory}/${fileName}`);

			// Check if file already exists
			const fileExists = this.app.vault.getAbstractFileByPath(filePath) !== null;
			if (fileExists) {
				new Notice(`File "${fileName}" already exists in ${directory}`, 5000);
				return;
			}

			// Ensure directory exists
			const folderExists = this.app.vault.getAbstractFileByPath(directory) !== null;
			if (!folderExists) {
				await this.app.vault.createFolder(directory);
			}
			const servingSizeLine = this.nutrientData.serving_size ? `serving_size: ${this.nutrientData.serving_size}\n` : "";
			const content = `---
name: ${this.nutrientData.name}
calories: ${this.nutrientData.calories}
fats: ${this.nutrientData.fats}
saturated_fats: ${this.nutrientData.saturated_fats}
carbs: ${this.nutrientData.carbs}
sugar: ${this.nutrientData.sugar}
fiber: ${this.nutrientData.fiber}
protein: ${this.nutrientData.protein}
sodium: ${this.nutrientData.sodium}
${servingSizeLine}---

`;

			await this.app.vault.create(filePath, content);
			new Notice(`Created nutrient file: ${fileName}`, 3000);
		} catch (error) {
			console.error("Error creating nutrient file:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			new Notice(`Failed to create nutrient file: ${errorMessage}`, 5000);
		}
	}

	/**
	 * Searches the OpenFoodFacts database for nutrition information
	 * Handles API response variations and error cases gracefully
	 */
	async searchOpenFoodFacts() {
		if (!this.nutrientData.name.trim() || this.isSearching) {
			return;
		}

		this.setSearchingState(true);

		try {
			const searchTerm = encodeURIComponent(this.nutrientData.name.trim());
			const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${searchTerm}&search_simple=1&action=process&json=1&page_size=5`;

			const response = await requestUrl({ url });

			if (response.status !== 200) {
				throw new Error(`HTTP error: ${response.status}`);
			}

			const data = response.json as OpenFoodFactsSearchResponse;

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
				this.searchResultsEl.empty();
				this.searchResultsEl.createDiv({
					cls: "food-tracker-search-error",
					text: "Search failed. Please check your internet connection and try again.",
				});
				this.showSearchResults(true);
			}
		} finally {
			this.setSearchingState(false);
		}
	}

	displaySearchResults() {
		if (!this.searchResultsEl) return;

		// Show the search results container and expand modal
		this.showSearchResults(true);

		this.searchResultsEl.empty();

		if (this.searchResults.length === 0) {
			this.searchResultsEl.createDiv({ text: "No results found.", cls: "food-tracker-search-no-results" });
			return;
		}

		const resultsContainer = this.searchResultsEl.createDiv({ cls: "food-tracker-search-results" });
		resultsContainer.createEl("h3", { text: "🔍 Search results from OpenFoodFacts:" });

		this.searchResults.forEach(product => {
			const productEl = resultsContainer.createDiv({ cls: "food-tracker-search-result-item" });

			// Make entire item clickable
			productEl.onclick = () => this.fillFromOpenFoodFacts(product);

			const productName = productEl.createDiv({ cls: "food-tracker-product-name" });
			productName.textContent = product.product_name ?? "Unknown product";

			// Add brand and category information
			const productInfo = productEl.createDiv({ cls: "food-tracker-product-info" });
			const brandText = product.brands ? `Brand: ${product.brands}` : "";
			const categoryText = product.categories ? `Category: ${product.categories.split(",")[0]}` : "";
			const quantityText = product.quantity ? `Size: ${product.quantity}` : "";

			const infoItems = [brandText, categoryText, quantityText].filter(item => item);
			if (infoItems.length > 0) {
				productInfo.textContent = infoItems.join(" • ");
			}

			const nutritionInfo = productEl.createDiv({ cls: "food-tracker-nutrition-preview" });
			const nutriments = product.nutriments;

			const calories = Number(nutriments["energy-kcal_100g"] ?? 0);
			const carbs = Number(nutriments["carbohydrates_100g"] ?? 0);
			const protein = Number(nutriments["proteins_100g"] ?? 0);
			const fat = Number(nutriments["fat_100g"] ?? 0);

			nutritionInfo.textContent = `Calories: ${calories.toFixed(1)}, Carbs: ${carbs.toFixed(1)}g, Protein: ${protein.toFixed(1)}g, Fat: ${fat.toFixed(1)}g (per 100g)`;
		});
	}

	/**
	 * Populates form fields with data from selected OpenFoodFacts product
	 * Converts units appropriately (sodium from grams to milligrams)
	 */
	fillFromOpenFoodFacts(product: OpenFoodFactsProduct) {
		const nutriments = product.nutriments;

		this.nutrientData.name = product.product_name ?? this.nutrientData.name;
		this.nutrientData.calories = Number(nutriments["energy-kcal_100g"] ?? 0);
		this.nutrientData.fats = Number(nutriments["fat_100g"] ?? 0);
		this.nutrientData.saturated_fats = Number(nutriments["saturated-fat_100g"] ?? 0);
		this.nutrientData.carbs = Number(nutriments["carbohydrates_100g"] ?? 0);
		this.nutrientData.sugar = Number(nutriments["sugars_100g"] ?? 0);
		this.nutrientData.fiber = Number(nutriments["fiber_100g"] ?? 0);
		this.nutrientData.protein = Number(nutriments["proteins_100g"] ?? 0);
		this.nutrientData.sodium = Number(nutriments["sodium_100g"] ?? 0) * 1000; // Convert from g to mg

		// Collapse modal back to initial state
		this.showSearchResults(false);

		// Update form field values without recreating the entire form
		this.updateFormValues();
	}

	private showSearchResults(show: boolean) {
		if (this.searchResultsEl) {
			if (show) {
				this.searchResultsEl.show();
				this.modalEl.addClass("food-tracker-nutrient-modal-expanded");
			} else {
				this.searchResultsEl.hide();
				this.modalEl.removeClass("food-tracker-nutrient-modal-expanded");
			}
		}
	}

	private updateFormValues() {
		if (this.nameInput) {
			this.nameInput.value = this.nutrientData.name;
		}

		if (this.formContainer) {
			// Find inputs that have our custom data attribute
			const nutrientInputs = this.formContainer.querySelectorAll<HTMLInputElement>("[data-nutrient-key]");

			nutrientInputs.forEach(input => {
				const key = input.dataset.nutrientKey as keyof NutrientData;
				if (key && key in this.nutrientData) {
					const value = this.nutrientData[key];
					input.value = typeof value === "number" ? value.toString() : String(value);
				}
			});
		}
	}

	private setSearchingState(searching: boolean) {
		this.isSearching = searching;
		if (this.searchButton) {
			this.searchButton.disabled = searching;
			if (searching) {
				this.searchButton.textContent = "⏳ Searching...";
				this.searchButton.addClass("food-tracker-search-button-searching");
			} else {
				this.searchButton.textContent = "🔍 Search";
				this.searchButton.removeClass("food-tracker-search-button-searching");
			}
		}
	}
}
