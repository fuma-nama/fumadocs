#!/bin/bash

# Usage: ./mirror-ui-change.sh [commit_hash]
# mirror changes in radix-ui to base-ui
COMMIT_HASH=$1

SRC_PATH="packages/radix-ui/src"
DEST_PATH="packages/base-ui/src"

# 1. Generate the patch
if [ -z "$COMMIT_HASH" ]; then
    echo "Capturing local changes from $SRC_PATH..."
    PATCH_DATA=$(git diff HEAD -- "$SRC_PATH")
else
    echo "Capturing commit $COMMIT_HASH from $SRC_PATH..."
    PATCH_DATA=$(git show "$COMMIT_HASH" -- "$SRC_PATH")
fi

if [ -z "$PATCH_DATA" ]; then
    echo "No changes found in $SRC_PATH."
    exit 0
fi

# 2. Apply the patch
# -p4 strips 'a/packages/radix-ui/src/' (4 levels)
# --directory prepends 'packages/base-ui/src/'
echo "$PATCH_DATA" | git apply --directory="$DEST_PATH" -p4

if [ $? -eq 0 ]; then
    echo "Successfully mirrored to $DEST_PATH"
else
    echo "Failed to apply patch. Ensure $DEST_PATH folder structure matches $SRC_PATH."
    exit 1
fi
