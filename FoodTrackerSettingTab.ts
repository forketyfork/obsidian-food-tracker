import { App, PluginSettingTab, Setting } from "obsidian";
import type FoodTrackerPlugin from "./FoodTrackerPlugin";
export default class FoodTrackerSettingTab extends PluginSettingTab {
	plugin: FoodTrackerPlugin;

	constructor(app: App, plugin: FoodTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Hello")
			.setDesc("Hello")
			.addText(text =>
				text.setValue(this.plugin.settings.hello).onChange(async value => {
					this.plugin.settings.hello = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
