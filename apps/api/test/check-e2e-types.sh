#!/bin/bash

# Script to check TypeScript types only for E2E test files
# This ensures that type errors in test files cause the build to fail

set -e

echo "Checking TypeScript types for E2E test files..."

# Run TypeScript compiler and capture output
OUTPUT=$(npx tsc --noEmit --project ./test/tsconfig.e2e.json 2>&1 || true)

# Filter only errors from test/e2e files
TEST_ERRORS=$(echo "$OUTPUT" | grep -E "^test/e2e/" || true)

if [ -n "$TEST_ERRORS" ]; then
  echo ""
  echo "❌ Type errors found in E2E test files:"
  echo "$TEST_ERRORS"
  exit 1
else
  echo "✅ All E2E test files have valid types"
  exit 0
fi

