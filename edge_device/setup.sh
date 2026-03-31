#!/bin/bash
set -e

# ─────────────────────────────────────────────
# ToolX EdgeSync DCA-6101 — Dev Environment Setup
# ─────────────────────────────────────────────
# Sets up:
#   1. external/include/ — headers copied from Docker builder image
#   2. compile_commands.json — for clangd / LSP

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTERNAL_INCLUDE="$SCRIPT_DIR/external/include"
COMPILE_COMMANDS="$SCRIPT_DIR/compile_commands.json"
IMAGE_NAME="edge-device-builder"
SOURCES=("main.cpp" "setup.cpp" "shutdown.cpp" "stable.cpp")

echo "==> Building Docker builder image (this may take a few minutes on first run)..."
docker build --target builder -t "$IMAGE_NAME" "$SCRIPT_DIR"

echo "==> Copying headers from builder image..."
mkdir -p "$EXTERNAL_INCLUDE"
docker run --rm \
  -v "$EXTERNAL_INCLUDE":/out \
  "$IMAGE_NAME" \
  cp -r /usr/local/include/. /out/

echo "==> Generating compile_commands.json..."

INCLUDE_FLAGS="-I$EXTERNAL_INCLUDE/azureiot -I$EXTERNAL_INCLUDE -I$SCRIPT_DIR/include"
COMMON_FLAGS="-std=c++17 $INCLUDE_FLAGS"

cat > "$COMPILE_COMMANDS" <<EOF
[
EOF

FIRST=true
for SRC in "${SOURCES[@]}"; do
  STEM="${SRC%.cpp}"
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$COMPILE_COMMANDS"
  fi
  cat >> "$COMPILE_COMMANDS" <<EOF
  {
    "directory": "$SCRIPT_DIR",
    "command": "/usr/bin/c++ $COMMON_FLAGS -o CMakeFiles/main.dir/${STEM}.cpp.o -c $SCRIPT_DIR/$SRC",
    "file": "$SCRIPT_DIR/$SRC"
  }
EOF
done

cat >> "$COMPILE_COMMANDS" <<EOF
]
EOF

echo ""
echo "✓ Done. Your dev environment is ready."
echo ""
echo "  Headers:           $EXTERNAL_INCLUDE"
echo "  compile_commands:  $COMPILE_COMMANDS"
echo ""
echo "  Open the project in Neovim (or any clangd-based editor) and LSP should work out of the box."
