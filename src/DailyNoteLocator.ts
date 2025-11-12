import { TFile, moment } from "obsidian";
import { SettingsService } from "./SettingsService";

const obsidianMoment = moment as unknown as typeof import("moment");

export interface DailyNoteMatch {
	key: string;
	date: Date;
}

export default class DailyNoteLocator {
	private settingsService: SettingsService;

	constructor(settingsService: SettingsService) {
		this.settingsService = settingsService;
	}

	match(file: TFile): DailyNoteMatch | null {
		const format = this.getFormat();
		if (!format || !this.hasRequiredTokens(format)) {
			return null;
		}

		for (const candidate of this.getCandidates(file)) {
			const parsed = obsidianMoment(candidate, format, true);
			if (parsed.isValid()) {
				return {
					key: parsed.format("YYYY-MM-DD"),
					date: parsed.toDate(),
				};
			}
		}

		return null;
	}

	private getFormat(): string {
		const value = this.settingsService.currentDailyNoteFormat?.trim() ?? "";
		return value || "YYYY-MM-DD";
	}

	private hasRequiredTokens(format: string): boolean {
		return /Y/.test(format) && /M/.test(format) && /D/.test(format);
	}

	private getCandidates(file: TFile): string[] {
		const candidates = new Set<string>();

		if (file.basename) {
			candidates.add(file.basename);
		}

		const pathWithoutExtension = this.removeExtension(file.path, file.extension);
		if (pathWithoutExtension) {
			candidates.add(pathWithoutExtension);
		}

		return Array.from(candidates);
	}

	private removeExtension(path: string, extension: string | undefined): string {
		if (!extension) {
			return path;
		}
		const escaped = extension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`\\.${escaped}$`, "i");
		return path.replace(regex, "");
	}
}
