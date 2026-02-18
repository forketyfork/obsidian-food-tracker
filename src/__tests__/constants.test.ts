import { INVALID_FILENAME_CHARS_REGEX, isBarcode } from "../constants";

describe("filename handling integration", () => {
	test("preserves German umlauts and Eszett", () => {
		expect("Müsli123".replace(INVALID_FILENAME_CHARS_REGEX, "_")).toBe("Müsli123");
		expect("Müsli mit Früchten".replace(INVALID_FILENAME_CHARS_REGEX, "_")).toBe("Müsli_mit_Früchten");
		expect("Weißbrot".replace(INVALID_FILENAME_CHARS_REGEX, "_")).toBe("Weißbrot");
	});

	test("preserves Czech diacritical characters", () => {
		const czech = "Jogurt bílý krémový";
		const result = czech.replace(INVALID_FILENAME_CHARS_REGEX, "_");
		expect(result).toBe("Jogurt_bílý_krémový");
	});

	test("preserves Slovak diacritical characters", () => {
		const slovak = "Smotana Kyslá";
		const result = slovak.replace(INVALID_FILENAME_CHARS_REGEX, "_");
		expect(result).toBe("Smotana_Kyslá");
	});

	test("preserves French diacritical characters", () => {
		const french = "Crème brûlée";
		const result = french.replace(INVALID_FILENAME_CHARS_REGEX, "_");
		expect(result).toBe("Crème_brûlée");
	});

	test("preserves Spanish diacritical characters", () => {
		const spanish = "Jalapeño picañón";
		const result = spanish.replace(INVALID_FILENAME_CHARS_REGEX, "_");
		expect(result).toBe("Jalapeño_picañón");
	});

	test("full filename conversion preserves umlauts and diacritics directly", () => {
		const foodName = "Müsli mit Früchten & Nüssen!";
		const converted = foodName.replace(INVALID_FILENAME_CHARS_REGEX, "_");
		expect(converted).toBe("Müsli_mit_Früchten___Nüssen_");
	});
});

describe("isBarcode", () => {
	test("recognizes valid EAN-8 barcodes (8 digits)", () => {
		expect(isBarcode("12345678")).toBe(true);
		expect(isBarcode("00000000")).toBe(true);
	});

	test("recognizes valid UPC-A barcodes (12 digits)", () => {
		expect(isBarcode("012345678901")).toBe(true);
		expect(isBarcode("123456789012")).toBe(true);
	});

	test("recognizes valid EAN-13 barcodes (13 digits)", () => {
		expect(isBarcode("3017624010701")).toBe(true); // Nutella
		expect(isBarcode("5000159484695")).toBe(true);
	});

	test("recognizes valid ITF-14 barcodes (14 digits)", () => {
		expect(isBarcode("12345678901234")).toBe(true);
		expect(isBarcode("00000000000000")).toBe(true);
	});

	test("rejects strings that are too short", () => {
		expect(isBarcode("1234567")).toBe(false); // 7 digits
		expect(isBarcode("123")).toBe(false);
		expect(isBarcode("1")).toBe(false);
		expect(isBarcode("")).toBe(false);
	});

	test("rejects strings that are too long", () => {
		expect(isBarcode("123456789012345")).toBe(false); // 15 digits
		expect(isBarcode("1234567890123456789")).toBe(false);
	});

	test("rejects non-numeric strings", () => {
		expect(isBarcode("Nutella")).toBe(false);
		expect(isBarcode("chicken breast")).toBe(false);
		expect(isBarcode("12345678a")).toBe(false);
		expect(isBarcode("1234-5678")).toBe(false);
		expect(isBarcode("1234.5678")).toBe(false);
	});

	test("handles whitespace correctly", () => {
		expect(isBarcode("  3017624010701  ")).toBe(true);
		expect(isBarcode("3017624010701 ")).toBe(true);
		expect(isBarcode(" 3017624010701")).toBe(true);
	});

	test("rejects strings with internal spaces", () => {
		expect(isBarcode("301 762 401")).toBe(false);
		expect(isBarcode("3017 6240 10701")).toBe(false);
	});
});
