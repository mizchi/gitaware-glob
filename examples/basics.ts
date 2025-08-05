import { glob, walk, findGitignore, parseGitignoreToExclude } from "../src/index";

// Basic usage - async generator
console.log('\n=== Basic async generator usage ===');
for await (const file of glob('**/*.ts')) {
  console.log(file);
}

// Collect all results using Array.fromAsync (Node.js 22+)
console.log('\n=== Using Array.fromAsync ===');
const tsFiles = await Array.fromAsync(glob('**/*.ts'));
console.log('TypeScript files:', tsFiles);

// With specific directory
console.log('\n=== With cwd option ===');
const srcFiles = await Array.fromAsync(glob('**/*.js', { cwd: 'src' }));
console.log('JavaScript files in src:', srcFiles);

// With file types (returns Dirent objects)
console.log('\n=== With withFileTypes option ===');
for await (const entry of glob('**/*.json', { withFileTypes: true })) {
  console.log(`${entry.name} (${entry.isDirectory() ? 'directory' : 'file'})`);
}

// With additional gitignore files (e.g., global gitignore)
console.log('\n=== With additionalGitignoreFiles option ===');
const filesWithGlobalIgnore = await Array.fromAsync(
  glob("**/*.log", {
    additionalGitignoreFiles: ["/home/user/.gitignore_global"]
  })
);
console.log('Log files (respecting global gitignore):', filesWithGlobalIgnore);

// Walk directory tree (no glob pattern needed)
console.log('\n=== Walk directory tree ===');
const walkedFiles = await Array.fromAsync(walk());
console.log('All files (respecting .gitignore):', walkedFiles);

// Walk with file types
console.log('\n=== Walk with file types ===');
for await (const entry of walk({ withFileTypes: true })) {
  if (entry.isDirectory()) {
    console.log(`[DIR] ${entry.name}`);
  } else {
    console.log(`[FILE] ${entry.name}`);
  }
}

// Find all .gitignore files up to the root
console.log('\n=== Finding .gitignore files ===');
const gitignoreFiles = await findGitignore(process.cwd());
console.log('Found .gitignore files:', gitignoreFiles);

// Parse a .gitignore file
if (gitignoreFiles.length > 0) {
  console.log('\n=== Parsing .gitignore ===');
  const excludePatterns = await parseGitignoreToExclude(gitignoreFiles[0]);
  console.log('Exclude patterns:', excludePatterns);
}