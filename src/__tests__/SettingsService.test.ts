import { DEFAULT_FRONTMATTER_FIELD_NAMES, DEFAULT_SETTINGS, SettingsService } from "../SettingsService";

describe("SettingsService", () => {
	test("initializes with a clone of default frontmatter field names", () => {
		const service = new SettingsService();
		service.initialize(DEFAULT_SETTINGS);

		const first = service.currentFrontmatterFieldNames;
		service.updateFrontmatterFieldNames({ calories: "custom-cal" });
		const second = service.currentFrontmatterFieldNames;

		expect(first).not.toBe(second);
		expect(first.calories).toBe(DEFAULT_FRONTMATTER_FIELD_NAMES.calories);
	});

	test("sanitizes duplicate or empty custom field names", () => {
		const service = new SettingsService();
		service.initialize({
			...DEFAULT_SETTINGS,
			frontmatterFieldNames: {
				...DEFAULT_FRONTMATTER_FIELD_NAMES,
				calories: " energy ",
				protein: "energy", // duplicate should fallback to default
				carbs: "", // empty should fallback to default
			},
		});

		const names = service.currentFrontmatterFieldNames;

		expect(names.calories).toBe("energy");
		expect(names.protein).toBe(DEFAULT_FRONTMATTER_FIELD_NAMES.protein);
		expect(names.carbs).toBe(DEFAULT_FRONTMATTER_FIELD_NAMES.carbs);
	});
});
