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

export default class NutrientModal extends Modal {
	plugin: FoodTrackerPlugin;
	nutrientData: NutrientData;

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
			);

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
}
