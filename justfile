# Obsidian Food Tracker - Development Commands

# List all available commands
default:
    @just --list

# Clean build artifacts and dependencies
clean:
    rm -rf node_modules
    rm -rf main.js
    rm -rf styles.css
    rm -rf coverage

# Install dependencies
install:
    yarn install

# Full production build (typecheck, lint, format, build, test)
build:
    yarn build

# Development build
dev:
    yarn dev

# Development build with watch mode
watch:
    yarn dev:watch

# Production build without tests
prod:
    yarn prod

# Run TypeScript type checking
typecheck:
    yarn typecheck

# Run tests
test:
    yarn test

# Run tests in development mode
test-dev:
    yarn test:dev

# Run tests in watch mode
test-watch:
    yarn test:watch

# Run tests with coverage
coverage:
    yarn coverage

# Run ESLint
lint:
    yarn lint

# Format code with Prettier
format:
    yarn format

# Build CSS from source
build-css:
    yarn build:css

# Bump version
version VERSION:
    yarn version --immediate {{VERSION}}
    yarn run version

# Full release (version, push, tags)
release VERSION:
    yarn release -- {{VERSION}}

# Tag release (after release command)
tag-release:
    yarn tag-release
