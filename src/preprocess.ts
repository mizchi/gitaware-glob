/**
 * Preprocess patterns for early directory exclusion
 * 
 * This handles deterministic directory exclusions that can be applied
 * during glob traversal for performance optimization.
 * Note: Cannot handle cases with negation patterns mixed in.
 */


/**
 * Extract directory patterns that can be used for early exclusion
 * @param patterns All gitignore patterns
 * @returns Patterns suitable for early directory exclusion
 */
export function extractEarlyExcludePatterns(patterns: string[]): string[] {
  const earlyExclude: string[] = [];
  
  // Only process if there are no negation patterns
  // (negation patterns require full postprocessing)
  const hasNegations = patterns.some(p => p.startsWith('!'));
  if (hasNegations) {
    return [];
  }
  
  for (const pattern of patterns) {
    // Skip negation patterns
    if (pattern.startsWith('!')) {
      continue;
    }
    
    // Simple directory names without wildcards
    if (!pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[')) {
      if (pattern.endsWith('/')) {
        // Explicit directory pattern
        earlyExclude.push(pattern.slice(0, -1) + '/**');
      } else if (!pattern.includes('/') && !pattern.includes('.')) {
        // Likely a directory name (no extension, no path separator)
        earlyExclude.push(pattern + '/**');
      }
    }
    
    // Patterns ending with /** can be used for early exclusion
    if (pattern.endsWith('/**')) {
      earlyExclude.push(pattern);
    }
  }
  
  return earlyExclude;
}

/**
 * Preprocess gitignore patterns into categories
 * @param patterns Raw gitignore patterns
 * @returns Categorized patterns for efficient processing
 */
export function preprocessPatterns(patterns: string[]): {
  earlyExclude: string[];
  postprocessPatterns: string[];
} {
  const earlyExclude = extractEarlyExcludePatterns(patterns);
  
  // All patterns need to go through postprocessing for accurate matching
  // But we can still use earlyExclude for optimization during traversal
  return {
    earlyExclude,
    postprocessPatterns: patterns
  };
}