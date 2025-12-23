import { BehaviorSubject, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { SPECIAL_CHARS_REGEX } from "./constants";

export interface FrontmatterFieldNames {
	calories: string;
	fats: string;
	saturated_fats: string;
	protein: string;
	carbs: string;
	fiber: string;
	sugar: string;
	sodium: string;
}

export const DEFAULT_FRONTMATTER_FIELD_NAMES: FrontmatterFieldNames = {
	calories: "ft-calories",
	fats: "ft-fats",
	saturated_fats: "ft-saturated_fats",
	protein: "ft-protein",
	carbs: "ft-carbs",
	fiber: "ft-fiber",
	sugar: "ft-sugar",
	sodium: "ft-sodium",
};

export interface FoodTrackerPluginSettings {
	nutrientDirectory: string;
	totalDisplayMode: "status-bar" | "document";
	foodTag: string;
	workoutTag: string;
	goalsFile: string;
	showCalorieHints: boolean;
	dailyNoteFormat: string;
	frontmatterFieldNames: FrontmatterFieldNames;
}

export const DEFAULT_SETTINGS: FoodTrackerPluginSettings = {
	nutrientDirectory: "nutrients",
	totalDisplayMode: "status-bar",
	foodTag: "food",
	workoutTag: "workout",
	goalsFile: "nutrition-goals.md",
	showCalorieHints: true,
	dailyNoteFormat: "YYYY-MM-DD",
	frontmatterFieldNames: DEFAULT_FRONTMATTER_FIELD_NAMES,
};

/**
 * Reactive service for managing all plugin settings
 * Uses RxJS BehaviorSubject to notify subscribers when settings change
 */
export class SettingsService {
	private settingsSubject = new BehaviorSubject<FoodTrackerPluginSettings>(DEFAULT_SETTINGS);

	/**
	 * Observable stream of all settings
	 */
	get settings$(): Observable<FoodTrackerPluginSettings> {
		return this.settingsSubject.asObservable();
	}

	/**
	 * Observable stream of the food tag
	 */
	get foodTag$(): Observable<string> {
		return this.settings$.pipe(map(settings => settings.foodTag));
	}

	/**
	 * Observable stream of the workout tag
	 */
	get workoutTag$(): Observable<string> {
		return this.settings$.pipe(map(settings => settings.workoutTag));
	}

	/**
	 * Observable stream of the escaped food tag (for regex usage)
	 */
	get escapedFoodTag$(): Observable<string> {
		return this.foodTag$.pipe(map(foodTag => foodTag.replace(SPECIAL_CHARS_REGEX, "\\$&")));
	}

	/**
	 * Observable stream of the escaped workout tag (for regex usage)
	 */
	get escapedWorkoutTag$(): Observable<string> {
		return this.workoutTag$.pipe(map(workoutTag => workoutTag.replace(SPECIAL_CHARS_REGEX, "\\$&")));
	}

	/**
	 * Observable stream of the nutrient directory
	 */
	get nutrientDirectory$(): Observable<string> {
		return this.settings$.pipe(map(settings => settings.nutrientDirectory));
	}

	/**
	 * Observable stream of the goals file path
	 */
	get goalsFile$(): Observable<string> {
		return this.settings$.pipe(map(settings => settings.goalsFile));
	}

	/**
	 * Observable stream of the daily note filename format
	 */
	get dailyNoteFormat$(): Observable<string> {
		return this.settings$.pipe(map(settings => settings.dailyNoteFormat));
	}

	/**
	 * Observable stream of the total display mode
	 */
	get totalDisplayMode$(): Observable<"status-bar" | "document"> {
		return this.settings$.pipe(map(settings => settings.totalDisplayMode));
	}

	/**
	 * Observable stream of the show calorie hints setting
	 */
	get showCalorieHints$(): Observable<boolean> {
		return this.settings$.pipe(map(settings => settings.showCalorieHints));
	}

	/**
	 * Observable stream of the frontmatter field names
	 */
	get frontmatterFieldNames$(): Observable<FrontmatterFieldNames> {
		return this.settings$.pipe(map(settings => settings.frontmatterFieldNames));
	}

	/**
	 * Get the current settings value synchronously
	 */
	get currentSettings(): FoodTrackerPluginSettings {
		return this.settingsSubject.value;
	}

	/**
	 * Get the current food tag value synchronously
	 */
	get currentFoodTag(): string {
		return this.currentSettings.foodTag;
	}

	/**
	 * Get the current workout tag value synchronously
	 */
	get currentWorkoutTag(): string {
		return this.currentSettings.workoutTag;
	}

	/**
	 * Get the current escaped food tag value synchronously
	 */
	get currentEscapedFoodTag(): string {
		return this.currentFoodTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
	}

	/**
	 * Get the current escaped workout tag value synchronously
	 */
	get currentEscapedWorkoutTag(): string {
		return this.currentWorkoutTag.replace(SPECIAL_CHARS_REGEX, "\\$&");
	}

	/**
	 * Get the current nutrient directory value synchronously
	 */
	get currentNutrientDirectory(): string {
		return this.currentSettings.nutrientDirectory;
	}

	/**
	 * Get the current goals file path synchronously
	 */
	get currentGoalsFile(): string {
		return this.currentSettings.goalsFile;
	}

	/**
	 * Get the current daily note filename format synchronously
	 */
	get currentDailyNoteFormat(): string {
		return this.currentSettings.dailyNoteFormat;
	}

	/**
	 * Get the current total display mode value synchronously
	 */
	get currentTotalDisplayMode(): "status-bar" | "document" {
		return this.currentSettings.totalDisplayMode;
	}

	/**
	 * Get the current show calorie hints value synchronously
	 */
	get currentShowCalorieHints(): boolean {
		return this.currentSettings.showCalorieHints;
	}

	/**
	 * Get the current frontmatter field names synchronously
	 */
	get currentFrontmatterFieldNames(): FrontmatterFieldNames {
		return this.currentSettings.frontmatterFieldNames;
	}

	/**
	 * Updates all settings and notifies all subscribers
	 */
	updateSettings(newSettings: FoodTrackerPluginSettings): void {
		this.settingsSubject.next(newSettings);
	}

	/**
	 * Updates a specific setting and notifies all subscribers
	 */
	updateSetting<K extends keyof FoodTrackerPluginSettings>(key: K, value: FoodTrackerPluginSettings[K]): void {
		const currentSettings = this.currentSettings;
		this.updateSettings({
			...currentSettings,
			[key]: value,
		});
	}

	/**
	 * Updates the food tag and notifies all subscribers
	 */
	updateFoodTag(newFoodTag: string): void {
		this.updateSetting("foodTag", newFoodTag);
	}

	/**
	 * Updates the workout tag and notifies all subscribers
	 */
	updateWorkoutTag(newWorkoutTag: string): void {
		this.updateSetting("workoutTag", newWorkoutTag);
	}

	/**
	 * Updates the nutrient directory and notifies all subscribers
	 */
	updateNutrientDirectory(newDirectory: string): void {
		this.updateSetting("nutrientDirectory", newDirectory);
	}

	/**
	 * Updates the total display mode and notifies all subscribers
	 */
	updateTotalDisplayMode(newMode: "status-bar" | "document"): void {
		this.updateSetting("totalDisplayMode", newMode);
	}

	/**
	 * Updates the goals file path and notifies all subscribers
	 */
	updateGoalsFile(newFile: string): void {
		this.updateSetting("goalsFile", newFile);
	}

	/**
	 * Updates the daily note filename format and notifies all subscribers
	 */
	updateDailyNoteFormat(format: string): void {
		this.updateSetting("dailyNoteFormat", format);
	}

	/**
	 * Updates the show calorie hints setting and notifies all subscribers
	 */
	updateShowCalorieHints(show: boolean): void {
		this.updateSetting("showCalorieHints", show);
	}

	/**
	 * Updates frontmatter field names (partial update supported)
	 */
	updateFrontmatterFieldNames(fieldNames: Partial<FrontmatterFieldNames>): void {
		const currentFieldNames = this.currentFrontmatterFieldNames;
		this.updateSetting("frontmatterFieldNames", {
			...currentFieldNames,
			...fieldNames,
		});
	}

	/**
	 * Initialize the service with settings
	 */
	initialize(initialSettings: FoodTrackerPluginSettings): void {
		this.updateSettings(initialSettings);
	}
}
