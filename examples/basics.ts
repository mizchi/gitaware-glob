import { glob, findGitignore, parseGitignoreToExclude } from "@mizchi/gitaware-glob";

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