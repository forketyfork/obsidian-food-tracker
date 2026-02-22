import { App } from "obsidian";
import type FoodTrackerPlugin from "../FoodTrackerPlugin";
import NutrientModal from "../NutrientModal";

interface ModalTestContext {
	modal: NutrientModal;
	createFile: jest.MockedFunction<(path: string, content: string) => Promise<unknown>>;
}

function createModalContext(): ModalTestContext {
	const app = new App();
	const createFile: jest.MockedFunction<(path: string, content: string) => Promise<unknown>> = jest
		.fn()
		.mockResolvedValue(undefined);

	(app.vault as { getAbstractFileByPath: (path: string) => unknown }).getAbstractFileByPath = (path: string) => {
		if (path === "nutrients") {
			return {};
		}
		return null;
	};
	(app.vault as unknown as { create: (path: string, content: string) => Promise<unknown> }).create = createFile;
	(app.vault as unknown as { createFolder: (path: string) => Promise<unknown> }).createFolder = jest
		.fn()
		.mockResolvedValue(undefined);

	const plugin = {
		settings: {
			nutrientDirectory: "nutrients",
		},
	} as unknown as FoodTrackerPlugin;

	const modal = new NutrientModal(app, plugin);
	(modal as { app: App }).app = app;
	modal.nutrientData.name = "Trail mix";
	modal.nutrientData.serving_size = 28;
	modal.nutrientData.calories = 150;

	return {
		modal,
		createFile,
	};
}

describe("NutrientModal", () => {
	test("writes nutrition_per when per-serving mode is enabled", async () => {
		const { modal, createFile } = createModalContext();
		modal.isPerServingMode = true;

		await modal.createNutrientFile();

		expect(createFile).toHaveBeenCalledTimes(1);
		const content = createFile.mock.calls[0][1];
		expect(content).toContain("serving_size: 28");
		expect(content).toContain("nutrition_per: 28");
	});

	test("omits nutrition_per when per-serving mode is disabled", async () => {
		const { modal, createFile } = createModalContext();
		modal.isPerServingMode = false;

		await modal.createNutrientFile();

		expect(createFile).toHaveBeenCalledTimes(1);
		const content = createFile.mock.calls[0][1];
		expect(content).toContain("serving_size: 28");
		expect(content).not.toContain("nutrition_per:");
	});
});
