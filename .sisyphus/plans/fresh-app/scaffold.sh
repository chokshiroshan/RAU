#!/bin/bash
set -e

# Define root
ROOT="fresh-app"

echo "🚀 Scaffolding fresh-app in $ROOT..."

# Create directory structure
mkdir -p "$ROOT/packages/main/src"/{services,ipc,utils,config}
mkdir -p "$ROOT/packages/renderer/src"/{components,hooks,stores,api,utils}
mkdir -p "$ROOT/packages/shared/src"/{types,schemas,constants,utils}
mkdir -p "$ROOT/scripts"
mkdir -p "$ROOT/docs"
mkdir -p "$ROOT/tests"/{unit,integration,e2e}

# Copy documentation
echo "📚 Copying documentation..."
cp .sisyphus/plans/fresh-app/RECREATE.md "$ROOT/docs/RECREATE.md"
cp .sisyphus/plans/fresh-app/ARCHITECTURE.md "$ROOT/docs/ARCHITECTURE.md"
cp .sisyphus/plans/fresh-app/DEVELOPMENT.md "$ROOT/docs/DEVELOPMENT.md"
cp .sisyphus/plans/fresh-app/TECH_STACK.md "$ROOT/docs/TECH_STACK.md"
cp .sisyphus/plans/fresh-app/MIGRATION_GUIDE.md "$ROOT/docs/MIGRATION_GUIDE.md"

# Create placeholder README
echo "# RAU Fresh" > "$ROOT/README.md"
echo "See [docs/RECREATE.md](docs/RECREATE.md) for the recreation plan." >> "$ROOT/README.md"

echo "✅ Scaffold complete! check the $ROOT directory."
