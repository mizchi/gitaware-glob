import { glob, findGitignore, parseGitignoreToExclude } from "@mizchi/gitaware-glob";

// Find all TypeScript files, respecting .gitignore
const tsFiles = await glob('**/*.ts');
console.log('TypeScript files:', tsFiles);

// Find JavaScript files in src directory
const jsFiles = await glob('src/**/*.js', { cwd: process.cwd() });
console.log('JavaScript files:', jsFiles);

// Find all .gitignore files up to the root
const gitignoreFiles = await findGitignore(process.cwd());
console.log('Found .gitignore files:', gitignoreFiles);

// Parse a .gitignore file
if (gitignoreFiles.length > 0) {
  const excludePatterns = await parseGitignoreToExclude(gitignoreFiles[0]);
  console.log('Exclude patterns:', excludePatterns);
}