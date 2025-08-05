# Known Issues

These test cases represent edge cases where our implementation differs from git's behavior:

## 1. Nested Directory Negation

**Pattern**: 
- Parent: `debug/` (ignores entire directory)
- Child: `!trace.log` (in debug/.gitignore)

**Expected**: `logs/debug/trace.log` should NOT be ignored
**Actual**: File is ignored because parent directory is excluded

**Git Behavior**: Git processes child .gitignore files even in ignored directories

## 2. Wildcard Negation in Ignored Directories

**Pattern**:
- `images/` (ignores directory)
- `!images/*.png` (negates .png files)

**Expected**: PNG files in images/ should be included
**Actual**: All files in images/ are ignored

**Note**: This is a complex interaction between directory exclusion and wildcard negation patterns.

## Workaround

For now, avoid using:
- Negation patterns in .gitignore files within ignored directories
- Wildcard negations for files in ignored directories

Instead, use more specific patterns or restructure your .gitignore rules.