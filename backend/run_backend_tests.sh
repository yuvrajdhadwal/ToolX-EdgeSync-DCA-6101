#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR/test"

if [[ "$#" -gt 0 ]]; then
  TARGET="$1"

  if [[ -f "$TARGET" ]]; then
    echo "Running backend tests in: $TARGET"
    python -m pytest "$TARGET"
    exit 0
  fi

  if [[ -f "$TEST_DIR/$TARGET" ]]; then
    echo "Running backend tests in: $TEST_DIR/$TARGET"
    python -m pytest "$TEST_DIR/$TARGET"
    exit 0
  fi

  echo "Test target not found: $TARGET"
  exit 1
fi

if [[ ! -d "$TEST_DIR" ]]; then
  echo "No backend test directory found at: $TEST_DIR"
  echo "Create test files in backend/test (e.g. backend/test/test_api.py)."
  exit 0
fi

mapfile -t TEST_FILES < <(find "$TEST_DIR" -type f \( -name "test_*.py" -o -name "*_test.py" \) | sort)

if [[ "${#TEST_FILES[@]}" -eq 0 ]]; then
  echo "No backend tests found in: $TEST_DIR"
  echo "Expected files like: test_something.py or something_test.py"
  exit 0
fi

echo "Running all backend tests from: $TEST_DIR"
python -m pytest "${TEST_FILES[@]}"
