import { App, TFile } from "obsidian";

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

export default class GoalsService {
	private app: App;
	private goalsFile: string;
	private goals: NutrientGoals = {};

	constructor(app: App, goalsFile: string) {
		this.app = app;
		this.goalsFile = goalsFile;
	}

	setGoalsFile(path: string): void {
		this.goalsFile = path;
	}

	get currentGoals(): NutrientGoals {
		return this.goals;
	}

	async loadGoals(): Promise<void> {
		if (!this.goalsFile) {
			this.goals = {};
			return;
		}
		try {
			let file = this.app.vault.getAbstractFileByPath(this.goalsFile);
			if (file instanceof TFile) {
				const content = await this.app.vault.cachedRead(file);
				this.goals = this.parseGoals(content);
			} else {
				this.goals = {};
			}
		} catch (error) {
			console.error("Error loading goals file:", error);
			this.goals = {};
		}
	}

	private parseGoals(content: string): NutrientGoals {
		const goals: NutrientGoals = {};
		const lines = content.split(/\r?\n/);
		for (const line of lines) {
			const match = line.match(/^(\w+):\s*(\d+(?:\.\d+)?)/);
			if (match) {
				const key = match[1].toLowerCase();
				const value = parseFloat(match[2]);
				switch (key) {
					case "calories":
					case "fats":
					case "saturated_fats":
					case "protein":
					case "carbs":
					case "fiber":
					case "sugar":
					case "sodium":
						(goals as Record<string, number>)[key] = value;
						break;
				}
			}
		}
		return goals;
	}
}
