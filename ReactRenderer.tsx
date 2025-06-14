import React from "react";
import { createRoot, Root } from "react-dom/client";
import NutritionTotalReact from "./NutritionTotalReact";
import { NutritionStore } from "./NutritionStore";
import NutrientCache from "./NutrientCache";
import type { NutrientGoals } from "./GoalsService";

export class ReactNutritionRenderer {
	private root: Root | null = null;
	private store: NutritionStore;

	constructor(nutrientCache: NutrientCache) {
		this.store = new NutritionStore(nutrientCache);
	}

	render(
		container: HTMLElement,
		content: string,
		foodTag: string = "food",
		escaped = false,
		goals?: NutrientGoals
	): void {
		this.store.setGoals(goals);
		this.store.calculateTotalNutrients(content, foodTag, escaped);

		if (!this.store.hasNutrients) {
			this.cleanup();
			return;
		}

		if (!this.root) {
			this.root = createRoot(container);
		}

		this.root.render(<NutritionTotalReact store={this.store} />);
	}

	cleanup(): void {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
