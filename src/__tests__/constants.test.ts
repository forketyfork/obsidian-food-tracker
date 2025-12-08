import { convertGermanUmlauts, INVALID_FILENAME_CHARS_REGEX, isBarcode } from "../constants";

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
	test("umlauts are preserved by INVALID_FILENAME_CHARS_REGEX", () => {
		const textWithUmlauts = "Müsli123";
		const invalidCharsRemoved = textWithUmlauts.replace(INVALID_FILENAME_CHARS_REGEX, "_");
		// Should preserve umlauts, only replace spaces and special chars
		expect(invalidCharsRemoved).toBe("Müsli123");

		const textWithSpaces = "Müsli mit Früchten";
		const spacesReplaced = textWithSpaces.replace(INVALID_FILENAME_CHARS_REGEX, "_");
		expect(spacesReplaced).toBe("Müsli_mit_Früchten");
	});

	test("full filename conversion workflow", () => {
		const foodName = "Müsli mit Früchten & Nüssen!";
		const converted = convertGermanUmlauts(foodName).replace(INVALID_FILENAME_CHARS_REGEX, "_");
		expect(converted).toBe("Muesli_mit_Fruechten___Nuessen_");
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
