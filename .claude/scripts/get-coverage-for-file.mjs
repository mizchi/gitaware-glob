#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { resolve, relative } from 'path';
import { existsSync } from 'fs';

/**
 * 指定されたファイルのカバレッジ情報を抽出してフォーマット表示
 * Usage: node get-coverage-for-file.mjs <filepath>
 */

async function main() {
  const targetFile = process.argv[2];
  const coverageJsonPath = resolve('coverage/coverage-final.json');
  
  if (!existsSync(coverageJsonPath)) {
    console.error('Coverage data not found. Run "pnpm test:coverage" first.');
    process.exit(1);
  }

  try {
    const coverageData = JSON.parse(await readFile(coverageJsonPath, 'utf-8'));
    
    // 引数なしの場合、すべてのファイルのサマリーを表示
    if (!targetFile) {
      console.log('\n=== Coverage Summary for All Files ===\n');
      
      let totalSummary = {
        statements: { total: 0, covered: 0 },
        branches: { total: 0, covered: 0 },
        functions: { total: 0, covered: 0 },
        lines: { total: 0, covered: 0 }
      };
      
      for (const [path, coverage] of Object.entries(coverageData)) {
        const relativePath = relative(process.cwd(), path);
        const summary = calculateSummary(coverage);
        
        console.log(`${relativePath}:`);
        console.log(`  Statements: ${summary.statements.pct.toFixed(2)}% (${summary.statements.covered}/${summary.statements.total})`);
        console.log(`  Branches:   ${summary.branches.pct.toFixed(2)}% (${summary.branches.covered}/${summary.branches.total})`);
        console.log(`  Functions:  ${summary.functions.pct.toFixed(2)}% (${summary.functions.covered}/${summary.functions.total})`);
        console.log(`  Lines:      ${summary.lines.pct.toFixed(2)}% (${summary.lines.covered}/${summary.lines.total})`);
        console.log('');
        
        // 総計に加算
        totalSummary.statements.total += summary.statements.total;
        totalSummary.statements.covered += summary.statements.covered;
        totalSummary.branches.total += summary.branches.total;
        totalSummary.branches.covered += summary.branches.covered;
        totalSummary.functions.total += summary.functions.total;
        totalSummary.functions.covered += summary.functions.covered;
        totalSummary.lines.total += summary.lines.total;
        totalSummary.lines.covered += summary.lines.covered;
      }
      
      // 総計を表示
      console.log('=== Total Coverage ===');
      console.log(`  Statements: ${(totalSummary.statements.covered / totalSummary.statements.total * 100).toFixed(2)}% (${totalSummary.statements.covered}/${totalSummary.statements.total})`);
      console.log(`  Branches:   ${(totalSummary.branches.covered / totalSummary.branches.total * 100).toFixed(2)}% (${totalSummary.branches.covered}/${totalSummary.branches.total})`);
      console.log(`  Functions:  ${(totalSummary.functions.covered / totalSummary.functions.total * 100).toFixed(2)}% (${totalSummary.functions.covered}/${totalSummary.functions.total})`);
      console.log(`  Lines:      ${(totalSummary.lines.covered / totalSummary.lines.total * 100).toFixed(2)}% (${totalSummary.lines.covered}/${totalSummary.lines.total})`);
      
      console.log('\nUsage: node get-coverage-for-file.mjs <filepath> for detailed file coverage');
      return;
    }

    const absoluteTargetPath = resolve(targetFile);
    
    // カバレッジデータから対象ファイルを検索
    let fileCoverage = null;
    let matchedPath = null;
    
    for (const [path, coverage] of Object.entries(coverageData)) {
      if (path === absoluteTargetPath || path.endsWith(targetFile)) {
        fileCoverage = coverage;
        matchedPath = path;
        break;
      }
    }
    
    if (!fileCoverage) {
      console.log(`No coverage data found for: ${targetFile}`);
      console.log('\nAvailable files in coverage:');
      Object.keys(coverageData).forEach(path => {
        console.log(`  - ${relative(process.cwd(), path)}`);
      });
      return;
    }

    // カバレッジサマリーを表示
    console.log(`\n=== Coverage Report for ${relative(process.cwd(), matchedPath)} ===\n`);
    
    const summary = calculateSummary(fileCoverage);
    console.log('Summary:');
    console.log(`  Statements: ${summary.statements.pct.toFixed(2)}% (${summary.statements.covered}/${summary.statements.total})`);
    console.log(`  Branches:   ${summary.branches.pct.toFixed(2)}% (${summary.branches.covered}/${summary.branches.total})`);
    console.log(`  Functions:  ${summary.functions.pct.toFixed(2)}% (${summary.functions.covered}/${summary.functions.total})`);
    console.log(`  Lines:      ${summary.lines.pct.toFixed(2)}% (${summary.lines.covered}/${summary.lines.total})`);
    
    // カバーされていない行を表示
    const uncoveredLines = getUncoveredLines(fileCoverage);
    if (uncoveredLines.length > 0) {
      console.log('\nUncovered lines:');
      uncoveredLines.forEach(line => {
        console.log(`  Line ${line}`);
      });
    }
    
    // カバーされていないブランチを表示
    const uncoveredBranches = getUncoveredBranches(fileCoverage);
    if (uncoveredBranches.length > 0) {
      console.log('\nUncovered branches:');
      uncoveredBranches.forEach(branch => {
        console.log(`  Line ${branch.line}: ${branch.type} branch not taken`);
      });
    }
    
    // カバーされていない関数を表示
    const uncoveredFunctions = getUncoveredFunctions(fileCoverage);
    if (uncoveredFunctions.length > 0) {
      console.log('\nUncovered functions:');
      uncoveredFunctions.forEach(func => {
        console.log(`  ${func.name} at line ${func.line}`);
      });
    }
    
  } catch (error) {
    console.error('Error reading coverage data:', error.message);
    process.exit(1);
  }
}

function calculateSummary(fileCoverage) {
  const { s, b, f, statementMap, fnMap } = fileCoverage;
  
  const statements = {
    total: Object.keys(statementMap).length,
    covered: Object.values(s).filter(count => count > 0).length
  };
  statements.pct = statements.total > 0 ? (statements.covered / statements.total) * 100 : 100;
  
  let branchesTotal = 0;
  let branchesCovered = 0;
  Object.entries(b).forEach(([_key, counts]) => {
    counts.forEach(count => {
      branchesTotal++;
      if (count > 0) branchesCovered++;
    });
  });
  
  const branches = {
    total: branchesTotal,
    covered: branchesCovered,
    pct: branchesTotal > 0 ? (branchesCovered / branchesTotal) * 100 : 100
  };
  
  const functions = {
    total: Object.keys(fnMap).length,
    covered: Object.values(f).filter(count => count > 0).length
  };
  functions.pct = functions.total > 0 ? (functions.covered / functions.total) * 100 : 100;
  
  // 行カバレッジの計算
  const linesCovered = new Set();
  const linesTotal = new Set();
  
  Object.entries(statementMap).forEach(([key, loc]) => {
    for (let line = loc.start.line; line <= loc.end.line; line++) {
      linesTotal.add(line);
      if (s[key] > 0) {
        linesCovered.add(line);
      }
    }
  });
  
  const lines = {
    total: linesTotal.size,
    covered: linesCovered.size,
    pct: linesTotal.size > 0 ? (linesCovered.size / linesTotal.size) * 100 : 100
  };
  
  return { statements, branches, functions, lines };
}

function getUncoveredLines(fileCoverage) {
  const { s, statementMap } = fileCoverage;
  const uncoveredLines = new Set();
  
  Object.entries(s).forEach(([key, count]) => {
    if (count === 0) {
      const loc = statementMap[key];
      for (let line = loc.start.line; line <= loc.end.line; line++) {
        uncoveredLines.add(line);
      }
    }
  });
  
  return Array.from(uncoveredLines).sort((a, b) => a - b);
}

function getUncoveredBranches(fileCoverage) {
  const { b, branchMap } = fileCoverage;
  const uncoveredBranches = [];
  
  Object.entries(b).forEach(([key, counts]) => {
    const branch = branchMap[key];
    counts.forEach((count, index) => {
      if (count === 0) {
        uncoveredBranches.push({
          line: branch.loc.start.line,
          type: branch.type,
          branch: index
        });
      }
    });
  });
  
  return uncoveredBranches;
}

function getUncoveredFunctions(fileCoverage) {
  const { f, fnMap } = fileCoverage;
  const uncoveredFunctions = [];
  
  Object.entries(f).forEach(([key, count]) => {
    if (count === 0) {
      const func = fnMap[key];
      uncoveredFunctions.push({
        name: func.name || '<anonymous>',
        line: func.decl.start.line
      });
    }
  });
  
  return uncoveredFunctions;
}

main().catch(console.error);