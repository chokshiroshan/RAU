#!/bin/bash
# Generate macOS .icns from a 1024x1024 PNG source

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_PNG="$PROJECT_ROOT/assets/icon-1024.png"
ICONSET_DIR="$PROJECT_ROOT/build/icon.iconset"
ICNS_OUTPUT="$PROJECT_ROOT/build/icon.icns"

# Check if source PNG exists
if [ ! -f "$SOURCE_PNG" ]; then
  echo "Error: Source icon not found at $SOURCE_PNG"
  echo "Please create a 1024x1024 PNG icon first."
  exit 1
fi

# Create iconset directory
mkdir -p "$ICONSET_DIR"

echo "Generating icon sizes from $SOURCE_PNG..."

# Generate all required sizes for macOS .icns
# Reference: https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Optimizing/Optimizing.html

sips -z 16 16     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_16x16.png" 2>/dev/null
sips -z 32 32     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png" 2>/dev/null
sips -z 32 32     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_32x32.png" 2>/dev/null
sips -z 64 64     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_32x32@2x.png" 2>/dev/null
sips -z 128 128   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_128x128.png" 2>/dev/null
sips -z 256 256   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_128x128@2x.png" 2>/dev/null
sips -z 256 256   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_256x256.png" 2>/dev/null
sips -z 512 512   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_256x256@2x.png" 2>/dev/null
sips -z 512 512   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_512x512.png" 2>/dev/null
sips -z 1024 1024 "$SOURCE_PNG" --out "$ICONSET_DIR/icon_512x512@2x.png" 2>/dev/null

echo "Generating .icns file..."

# Generate .icns from iconset
iconutil -c icns "$ICONSET_DIR" -o "$ICNS_OUTPUT" 2>/dev/null

echo "Icon generated successfully at: $ICNS_OUTPUT"
