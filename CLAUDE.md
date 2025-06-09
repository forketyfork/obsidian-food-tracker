# CLAUDE.md

This file provides guidance to AI agents when working with code in this repository.

## Build Commands

- `yarn dev` - Development build
- `yarn dev:watch` - Development build with watch mode
- `yarn prod` - Production build without tests or type checking
- `yarn typecheck` — TypeScript typecheck
- `yarn format` - Format code with Prettier
- `yarn lint` - Check code style with ESLint
- `yarn test` - Run Jest tests
- `yarn test:dev` - Run development build and then tests
- `yarn test:watch` - Run development build and then tests in watch mode
- `yarn build` - Production build (includes tests, typecheck and formatting)
- `yarn build:css` - Minify CSS with CSSO (from styles.src.css to styles.css)
- `yarn version` - Bump version in manifest.json and versions.json

## General guidelines

- IMPORTANT: After finishing your task, make sure to run `yarn build` and fix any introduced issues.

## Typescript & Testing

- Strict null checks required (strictNullChecks: true)
- No implicit any values (noImplicitAny: true)
- Run type check with `yarn typecheck`
- ESLint is configured with typescript-eslint plugin
- Testing is done with Jest (`yarn test:dev`); make sure to always run the build before running the tests (`yarn test:dev` already takes care of that)
- All tests are in the `__tests__` directory
- Test files should end with `.test.ts`

## Code Style

- Avoid useless comments, use them to communicate obscure things and intentions which are not clear from the code rather than obvious details
- Use Obsidian API imports from a single import statement
- Use interfaces for type definitions
- Add explicit error handling with try/catch blocks
- Use async/await for asynchronous operations
- Error messages should be user-friendly
- Avoid unnecessary logging to the console, no debug messages, only errors
- Use consistent indentation (tabs) and spacing
- Class methods order: lifecycle methods first, then functionality
- Any text in UI elements should use "Sentence case" instead of "Title Case"
- Avoid committing changes in `yarn.lock` if you didn't change the `package.json` file, reset the `yarn.lock` file instead
- Avoid committing package-lock.json, since we use yarn; if this file is created as a result of your actions, remove it
- **Create separate files for new classes**: As a rule, add new classes as separate files unless they are tightly coupled to existing code

## Obsidian API Best Practices

- **Prefer metadata cache over file I/O**: Use `app.metadataCache.getFileCache(file)` instead of reading files with `app.vault.read()`
- **Use efficient file queries**: Prefer `app.vault.getMarkdownFiles()` with filtering over folder traversal when working with multiple files
- **Use Map for caching**: When caching file data, use `Map<string, T>` with file paths as keys for efficient updates and deletions
