# Food Tracker

[![Build status](https://github.com/forketyfork/obsidian-food-tracker/actions/workflows/build.yml/badge.svg)](https://github.com/forketyfork/obsidian-food-tracker/actions/workflows/build.yml)

An Obsidian plugin to track your food intake (calories, macronutrients) and nutritional information.

## Features

- **Add nutrients**: Create nutrient entries with detailed nutritional information through a convenient modal interface
- **Configurable storage**: Set a custom directory for storing nutrient files
- **Complete nutrition tracking**: Track calories, fats (total, saturated, unsaturated, omega-3), carbohydrates, sugar, fiber, protein, and sodium
- **Metadata format**: Stores nutritional data in YAML frontmatter for easy querying and analysis

## Installation

### From Obsidian Community Plugins

1. Open Obsidian
2. Go to Settings > Community plugins
3. Disable Safe mode if necessary
4. Click Browse and search for "Food Tracker"
5. Install the plugin
6. Enable the plugin after installation

### Manual Installation

1. Download the latest release from the GitHub repository
2. Extract the ZIP file into your Obsidian vault's `.obsidian/plugins/` folder
3. Enable the plugin in Obsidian settings

## Usage

### Adding nutrients

1. Open the command palette (Ctrl/Cmd + P)
2. Search for "Add nutrient" and select the command
3. Fill in the nutrient information in the modal:
   - Name (required)
   - Calories
   - Total fats, saturated fats, unsaturated fats, omega-3 fats (in grams)
   - Carbohydrates, sugar, fiber (in grams)
   - Protein (in grams)
   - Sodium (in milligrams)
4. Click "Create" to save the nutrient file

### Configuration

Go to Settings > Food Tracker to configure:

- **Nutrient directory**: Choose where nutrient files are stored (default: "nutrients")

## Requirements

- Obsidian v0.15.0 or higher

## Development

Run the development build with change watch:

```shell
yarn dev:watch
```

Run the TypeScript type check:

```shell
yarn typecheck
```

Run the linter:

```shell
yarn lint
```

Run the tests:

```shell
yarn test
```

Run the tests in watch mode:

```shell
yarn test:watch
```

Generate a coverage report:

```shell
yarn coverage
```

Run the production build (includes tests, type checking, and formatting):

```shell
yarn build
```

Bump the version in `package.json` and `manifest.json`, push the `main` branch,
and publish a new tag:

```shell
yarn release
```

## License

This plugin is licensed under the MIT License.
