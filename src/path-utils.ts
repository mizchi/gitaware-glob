/**
 * Path utilities that work in both Node.js and browser environments
 */

/**
 * Join path segments
 */
export function join(...paths: string[]): string {
  return paths
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/\/\.\//g, '/')
    .replace(/\/[^/]+\/\.\.\//g, '/');
}

/**
 * Check if a path is absolute
 */
export function isAbsolute(path: string): boolean {
  return path.startsWith('/');
}

/**
 * Get relative path from base to target
 */
export function relative(from: string, to: string): string {
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);
  
  let commonLength = 0;
  for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++;
    } else {
      break;
    }
  }
  
  const upCount = fromParts.length - commonLength;
  const ups = Array(upCount).fill('..');
  const remaining = toParts.slice(commonLength);
  
  return [...ups, ...remaining].join('/') || '.';
}