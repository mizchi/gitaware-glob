#!/bin/bash

# List untracked and modified temporary verification scripts
echo "=== Temporary verification scripts ==="

# Common patterns for temporary files (lowercase)
patterns=(
    "test-*"
    "test_*"
    "*_improved*"
    "*-improved*"
    "*better*"
    "*enhanced*"
    "tmp-*"
    "tmp_*"
    "temp-*"
    "temp_*"
    "check-*"
    "check_*"
    "verify-*"
    "verify_*"
    "validate-*"
    "validate_*"
)

# Get all untracked and modified files
files=$(git ls-files --others --exclude-standard --modified)

# Filter files matching temporary patterns (case insensitive)
for file in $files; do
    basename=$(basename "$file")
    basename_lower=$(echo "$basename" | tr '[:upper:]' '[:lower:]')
    
    for pattern in "${patterns[@]}"; do
        # Convert pattern to lowercase for comparison
        pattern_lower=$(echo "$pattern" | tr '[:upper:]' '[:lower:]')
        
        if [[ "$basename_lower" == $pattern_lower ]]; then
            echo "$file"
            break
        fi
    done
done