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
    pnpm install

# Full production build (typecheck, lint, format, build, test)
build:
    pnpm build

# Development build
dev:
    pnpm dev

# Development build with watch mode
watch:
    pnpm dev:watch

# Production build without tests
prod:
    pnpm prod

# Run TypeScript type checking
typecheck:
    pnpm typecheck

# Run tests
test:
    pnpm test

# Run tests in development mode
test-dev:
    pnpm test:dev

# Run tests in watch mode
test-watch:
    pnpm test:watch

# Run tests with coverage
coverage:
    pnpm coverage

# Run ESLint
lint:
    pnpm lint

# Format code with Prettier
format:
    pnpm format

# Build CSS from source
build-css:
    pnpm build:css

# Bump version
version VERSION:
    npm version --no-git-tag-version {{VERSION}}
    pnpm run version

# Full release (version, push, tags)
release VERSION:
    pnpm release {{VERSION}}

# Tag release (after release command)
tag-release:
    pnpm tag-release
