import globals from "globals";
import obsidianmd from "eslint-plugin-obsidianmd";
import { DEFAULT_BRANDS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js";

export default [
	// Global ignores
	{
		ignores: [
			"**/node_modules/",
			"**/.yarn/",
			"**/main.js",
			"coverage/**",
			"src/__mocks__/**",
			"eslint.config.mjs",
			"esbuild.config.mjs",
			"jest.config.js",
			"version-bump.mjs",
			"release.mjs",
			"scripts/**/*.mjs",
		],
	},

	...obsidianmd.configs.recommended,

	// The recommended preset declares some type-checked rules without a `files`
	// filter, so they run on `.mjs`/`package.json` too. Disable them outside TS.
	{
		ignores: ["**/*.ts", "**/*.tsx"],
		rules: {
			"obsidianmd/no-plugin-as-component": "off",
			"obsidianmd/no-view-references-in-plugin": "off",
			"obsidianmd/no-unsupported-api": "off",
			"obsidianmd/prefer-file-manager-trash-file": "off",
			"obsidianmd/prefer-instanceof": "off",
		},
	},

	// Project-specific overrides applied on top of the recommended preset
	{
		files: ["**/*.ts"],
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				ecmaVersion: 2021,
				sourceType: "module",
			},
		},
		rules: {
			// Stricter than recommended's "warn" + args: "none".
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

			// Per CLAUDE.md: only console.error() is allowed.
			"obsidianmd/rule-custom-message": [
				"error",
				{
					"no-console": {
						messages: {
							"Unexpected console statement. Only these console methods are allowed: error.":
								"Avoid unnecessary logging to console. Only console.error() is allowed in this project.",
						},
						options: [{ allow: ["error"] }],
					},
				},
			],

			// Promise handling is not enabled by recommended.
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",

			// Allow empty functions (common in Obsidian plugins)
			"@typescript-eslint/no-empty-function": "off",

			// Additional type-safety rules not enabled by recommended.
			"@typescript-eslint/prefer-nullish-coalescing": "error",
			"@typescript-eslint/prefer-optional-chain": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",

			"obsidianmd/ui/sentence-case": [
				"error",
				{
					enforceCamelCaseLower: true,
					brands: [...DEFAULT_BRANDS, "Food Tracker", "OpenFoodFacts"],
					acronyms: ["URL", "YAML", "CSV"],
					ignoreRegex: ["https?://[^\\s)]+"],
				},
			],
		},
	},

	// Jest globals for test files
	{
		files: ["src/__tests__/**/*.ts"],
		languageOptions: {
			globals: {
				...globals.jest,
				...globals.node,
			},
		},
		rules: {
			"obsidianmd/no-global-this": "off",
			"obsidianmd/no-tfile-tfolder-cast": "off",
			"obsidianmd/prefer-active-doc": "off",
			"obsidianmd/prefer-window-timers": "off",
		},
	},
];
