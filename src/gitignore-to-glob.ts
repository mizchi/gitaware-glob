/**
 * Convert gitignore patterns to glob exclude patterns
 * 
 * Gitignore pattern rules:
 * - Lines starting with # are comments
 * - Empty lines are ignored
 * - Lines starting with ! are negation patterns
 * - Lines ending with / match directories only
 * - Lines starting with / are relative to the .gitignore location
 * - ** can be used to match multiple directory levels
 * - * matches anything except /
 * - ? matches any single character except /
 * - [...] matches character ranges
 */


/**
 * Handle directory patterns (ending with /)
 */
function handleDirectoryPattern(dirPattern: string, isNegation: boolean, baseDir?: string): string[] {
  const results: string[] = [];
  const prefix = isNegation ? '!' : '';
  
  if (dirPattern.startsWith('/')) {
    // Root-relative directory
    const path = dirPattern.substring(1);
    if (baseDir) {
      results.push(prefix + baseDir + '/' + path + '/**');
    } else {
      results.push(prefix + path + '/**');
    }
  } else if (dirPattern.includes('/')) {
    // Path with directory separators
    if (baseDir) {
      results.push(prefix + baseDir + '/' + dirPattern + '/**');
      if (!dirPattern.startsWith('**/')) {
        results.push(prefix + baseDir + '/**/' + dirPattern + '/**');
      }
    } else {
      results.push(prefix + dirPattern + '/**');
      if (!dirPattern.startsWith('**/')) {
        results.push(prefix + '**/' + dirPattern + '/**');
      }
    }
  } else {
    // Simple directory name
    if (baseDir) {
      results.push(prefix + baseDir + '/' + dirPattern + '/**');
      results.push(prefix + baseDir + '/**/' + dirPattern + '/**');
    } else {
      results.push(prefix + '**/' + dirPattern + '/**');
    }
  }
  
  return results;
}

/**
 * Handle patterns with ** wildcards
 */
function handleDoubleStarPattern(pattern: string, isNegation: boolean, baseDir?: string): string[] {
  const results: string[] = [];
  const prefix = isNegation ? '!' : '';
  
  if (baseDir) {
    if (pattern.startsWith('**/')) {
      // **/ at start means match anywhere under baseDir
      const subPattern = pattern.slice(3);
      results.push(prefix + baseDir + '/' + subPattern);
      results.push(prefix + baseDir + '/**/' + subPattern);
    } else {
      // Pattern contains **/ somewhere else
      results.push(prefix + baseDir + '/' + pattern);
    }
  } else {
    results.push(prefix + pattern);
  }
  
  return results;
}

/**
 * Handle regular patterns
 */
function handleRegularPattern(pattern: string, isNegation: boolean, baseDir?: string): string[] {
  const results: string[] = [];
  const prefix = isNegation ? '!' : '';
  
  if (pattern.includes('/')) {
    // Pattern with path separators
    if (baseDir) {
      results.push(prefix + baseDir + '/' + pattern);
      if (!pattern.startsWith('*')) {
        results.push(prefix + baseDir + '/**/' + pattern);
      }
    } else {
      results.push(prefix + pattern);
      if (!pattern.startsWith('*')) {
        results.push(prefix + '**/' + pattern);
      }
    }
  } else {
    // Simple pattern (file or wildcard)
    if (baseDir) {
      results.push(prefix + baseDir + '/' + pattern);
      results.push(prefix + baseDir + '/**/' + pattern);
      
      // If it looks like a directory name
      if (!pattern.includes('.') && !pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[')) {
        results.push(prefix + baseDir + '/' + pattern + '/**');
        results.push(prefix + baseDir + '/**/' + pattern + '/**');
      }
    } else {
      results.push(prefix + '**/' + pattern);
      
      // If it looks like a directory name
      if (!pattern.includes('.') && !pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[')) {
        results.push(prefix + '**/' + pattern + '/**');
      }
    }
  }
  
  return results;
}

export function gitignoreToGlob(pattern: string, baseDir?: string): string[] {
  const results: string[] = [];
  
  // Remove leading/trailing whitespace
  pattern = pattern.trim();
  
  // Skip empty lines and comments
  if (!pattern || pattern.startsWith('#')) {
    return [];
  }
  
  // .gitignore itself should never be ignored
  if (pattern === '.gitignore') {
    return [];
  }
  
  // Handle negation
  let isNegation = false;
  if (pattern.startsWith('!')) {
    isNegation = true;
    pattern = pattern.substring(1);
  }
  
  // Handle directory patterns (ending with /)
  if (pattern.endsWith('/')) {
    const dirPattern = pattern.slice(0, -1);
    return handleDirectoryPattern(dirPattern, isNegation, baseDir);
  }
  
  // Handle patterns starting with /
  if (pattern.startsWith('/')) {
    // Root-relative pattern (relative to .gitignore location)
    const path = pattern.substring(1);
    if (baseDir) {
      results.push((isNegation ? '!' : '') + baseDir + '/' + path);
    } else {
      results.push((isNegation ? '!' : '') + path);
    }
    return results;
  }
  
  // Handle patterns with **
  if (pattern.includes('**/')) {
    return handleDoubleStarPattern(pattern, isNegation, baseDir);
  }
  
  // Handle other patterns
  return handleRegularPattern(pattern, isNegation, baseDir);
}