import { convertGermanUmlauts, getUnitMultiplier, INVALID_FILENAME_CHARS_REGEX, isBarcode } from "../constants";

describe("convertGermanUmlauts", () => {
	test("converts lowercase umlauts correctly", () => {
		expect(convertGermanUmlauts("ü")).toBe("ue");
		expect(convertGermanUmlauts("ä")).toBe("ae");
		expect(convertGermanUmlauts("ö")).toBe("oe");
	});

	test("converts uppercase umlauts correctly", () => {
		expect(convertGermanUmlauts("Ü")).toBe("Ue");
		expect(convertGermanUmlauts("Ä")).toBe("Ae");
		expect(convertGermanUmlauts("Ö")).toBe("Oe");
	});

	test("converts multiple umlauts in a single string", () => {
		expect(convertGermanUmlauts("Müsli")).toBe("Muesli");
		expect(convertGermanUmlauts("Käse")).toBe("Kaese");
		expect(convertGermanUmlauts("Döner")).toBe("Doener");
		expect(convertGermanUmlauts("Hühnchenbrösel")).toBe("Huehnchenbroesel");
	});

	test("handles mixed case umlauts", () => {
		expect(convertGermanUmlauts("ÄpfelÖl")).toBe("AepfelOel");
		expect(convertGermanUmlauts("GrünKöhl")).toBe("GruenKoehl");
	});

	test("preserves non-umlaut characters", () => {
		expect(convertGermanUmlauts("Chicken")).toBe("Chicken");
		expect(convertGermanUmlauts("123")).toBe("123");
		expect(convertGermanUmlauts("Test-Food")).toBe("Test-Food");
	});

	test("handles empty strings and special cases", () => {
		expect(convertGermanUmlauts("")).toBe("");
		expect(convertGermanUmlauts("   ")).toBe("   ");
		expect(convertGermanUmlauts("no umlauts here")).toBe("no umlauts here");
	});

	test("handles real food names", () => {
		expect(convertGermanUmlauts("Müsli mit Früchten")).toBe("Muesli mit Fruechten");
		expect(convertGermanUmlauts("Würstchen")).toBe("Wuerstchen");
		expect(convertGermanUmlauts("Süßkartoffel")).toBe("Suesskartoffel");
	});

	test("converts Eszett (sharp s) correctly", () => {
		expect(convertGermanUmlauts("ß")).toBe("ss");
		expect(convertGermanUmlauts("Weißbrot")).toBe("Weissbrot");
		expect(convertGermanUmlauts("Groß")).toBe("Gross");
	});
});

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

	test("preserves decomposed Unicode accents (combining marks)", () => {
		const decomposed = "Cafe\u0301";
		const result = decomposed.replace(INVALID_FILENAME_CHARS_REGEX, "_");
		expect(result).toBe("Cafe\u0301");
	});

	test("preserves Hindi script with combining marks", () => {
		const hindi = "हिंदी";
		const result = hindi.replace(INVALID_FILENAME_CHARS_REGEX, "_");
		expect(result).toBe("हिंदी");
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

describe("getUnitMultiplier", () => {
	test("uses nutrition_per for gram-based units", () => {
		expect(getUnitMultiplier(28, "g", undefined, 28)).toBeCloseTo(1);
		expect(getUnitMultiplier(56, "g", undefined, 28)).toBeCloseTo(2);
	});

	test("falls back to 100 when nutrition_per is missing", () => {
		expect(getUnitMultiplier(50, "g")).toBeCloseTo(0.5);
		expect(getUnitMultiplier(100, "ml")).toBeCloseTo(1);
	});

	test("supports piece units with serving_size and nutrition_per", () => {
		expect(getUnitMultiplier(1, "pc", 28, 28)).toBeCloseTo(1);
		expect(getUnitMultiplier(2, "pcs", 28, 28)).toBeCloseTo(2);
	});
});
