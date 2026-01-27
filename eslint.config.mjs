import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import globals from "globals";
import js from "@eslint/js";

export default [
	// Global ignores
	{
		ignores: [
			"**/node_modules/",
			"**/.yarn/",
			"**/main.js",
			"**/*.js",
			"!eslint.config.mjs",
			"!esbuild.config.mjs",
			"!jest.config.js",
			"!version-bump.mjs",
		],
	},

	// TypeScript files
	{
		...js.configs.recommended,
		files: ["**/*.ts"],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				project: "./tsconfig.json",
				ecmaVersion: 2021,
				sourceType: "module",
			},
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
		plugins: {
			"@typescript-eslint": typescriptEslint,
		},
		rules: {
			...typescriptEslint.configs.recommended.rules,
			...typescriptEslint.configs["recommended-requiring-type-checking"].rules,

			// Disable base rule in favor of TypeScript version
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

			// Console restrictions per CLAUDE.md
			"no-console": ["error", { allow: ["error"] }],

			// Promise handling
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",

			// Allow empty functions (common in Obsidian plugins)
			"@typescript-eslint/no-empty-function": "off",

			// Additional type safety rules
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/prefer-nullish-coalescing": "error",
			"@typescript-eslint/prefer-optional-chain": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
		},
	},

	// JavaScript/MJS config files
	{
		files: ["**/*.js", "**/*.mjs"],
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: "module",
			globals: {
				...globals.node,
			},
		},
		rules: {
			"no-unused-vars": ["error", { args: "none" }],
			"no-console": "off", // Allow console in config files
		},
	},
];
