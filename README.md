# Food Tracker

[![Build status](https://github.com/forketyfork/obsidian-food-tracker/actions/workflows/build.yml/badge.svg)](https://github.com/forketyfork/obsidian-food-tracker/actions/workflows/build.yml)

An Obsidian plugin to track your food intake (calories, macronutrients) and nutritional information with real-time nutrition totals and intelligent food suggestions.

## Features

### 🍎 Food Database Management

- **Add nutrients**: Create nutrient entries with detailed nutritional information through a convenient modal interface
- **OpenFoodFacts integration**: Search and import nutritional data from the OpenFoodFacts database
- **Complete nutrition tracking**: Track calories, fats, carbohydrates, sugar, fiber, protein, and sodium
- **Metadata format**: Stores nutritional data in YAML frontmatter for easy querying and analysis
- **Configurable storage**: Set a custom directory for storing nutrient files

### 📝 Smart Food Entry

- **Intelligent autocomplete**: Type `#food` followed by a food name for intelligent suggestions from your nutrient database
- **Flexible food format**: Support for both `#food [[food-name]] amount` and `#food food-name amount` formats
- **Multiple units**: Support for various units including g, kg, ml, l, oz, lb, cups, tbsp, tsp
- **Visual highlighting**: Food amounts are highlighted in the editor for easy identification

### 📊 Real-time Nutrition Tracking

- **Automatic daily total**: Real-time calculation of total nutrition from all food entries in the current document
- **Flexible display modes**: Show nutrition total in status bar or directly in the document
- **Comprehensive metrics**: Track calories, fats, protein, carbohydrates, fiber, sugar, and sodium
- **Smart parsing**: Automatically detects and calculates nutrition from food entries throughout your notes

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

### Adding Food Items to Your Database

1. Open the command palette (Ctrl/Cmd + P)
2. Search for "Add nutrient" and select the command
3. Fill in the nutrient information in the modal:
   - **Name** (required)
   - **🔍 Search**: Use the search button to find foods in OpenFoodFacts database
   - **Nutritional values per 100g**:
     - Calories
     - Fats (in grams)
     - Carbohydrates, sugar, fiber (in grams)
     - Protein (in grams)
     - Sodium (in milligrams)
4. Click "Create" to save the nutrient file

### Tracking Food Intake

1. In any note, type `#food` followed by a space
2. Start typing a food name - autocomplete suggestions will appear from your database
3. Select a food item and add the amount with unit:
   ```
   #food [[apple]] 150g
   #food [[chicken-breast]] 200g
   #food [[oats]] 50g
   ```
4. The nutrition total will automatically update as you add food entries

### Configuration

Go to Settings > Food Tracker to configure:

- **Nutrient directory**: Choose where nutrient files are stored (default: "nutrients")
- **Nutrition total display**: Choose to show the total in the status bar or directly in the document

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
