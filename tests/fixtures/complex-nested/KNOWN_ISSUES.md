# Known Issues - RESOLVED

**Update**: As of the latest version, our implementation now correctly matches Git's behavior for ignored directories.

## Previous Issues (Now Fixed)

### 1. Nested Directory Negation

**Pattern**: 
- Parent: `debug/` (ignores entire directory)
- Child: `!trace.log` (in debug/.gitignore)

**Git Behavior**: Git does NOT process .gitignore files within ignored directories. Files in ignored directories remain ignored regardless of negation patterns in child .gitignore files.

**Status**: ✅ Fixed - Our implementation now matches Git's behavior

### 2. Wildcard Negation in Ignored Directories

**Pattern**:
- `images/` (ignores directory)
- `!images/*.png` (negates .png files)

**Git Behavior**: Negation patterns cannot "rescue" files from ignored directories. Once a directory is ignored, all files within it are ignored.

**Status**: ✅ Fixed - Our implementation now matches Git's behavior

## Git Specification

According to Git's design:
- When a directory is ignored (e.g., `build/`), Git does not descend into that directory
- Negation patterns (e.g., `!build/keep/`) cannot rescue files from ignored directories
- .gitignore files within ignored directories are not processed

This is intentional behavior in Git for performance reasons - avoiding traversal of ignored directory trees.