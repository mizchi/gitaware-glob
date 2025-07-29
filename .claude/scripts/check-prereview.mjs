#!/usr/bin/env zx

import { $, glob } from 'zx';
import { readFile, access } from 'fs/promises';
import path from 'path';

$.verbose = false;

const errors = [];
const warnings = [];
const success = [];

// プロジェクトルートを取得
const projectRoot = path.resolve(process.cwd());

console.log('🔍 プロジェクト構造チェックを開始します...\n');

// 1. ディレクトリ構造のチェック
console.log('📁 ディレクトリ構造の確認:');

// src/**/*.ts のチェック（*.test.tsを除く）
const srcFiles = await glob('src/**/*.ts', { 
  cwd: projectRoot,
  ignore: ['src/**/*.test.ts']
});
if (srcFiles.length > 0) {
  success.push(`✅ src/**/*.ts: ${srcFiles.length}個のファイルを検出`);
} else {
  errors.push('❌ src/**/*.ts: TypeScriptソースファイルが見つかりません');
}

// src/**/*.test.ts のチェック
const srcTestFiles = await glob('src/**/*.test.ts', { cwd: projectRoot });
if (srcTestFiles.length > 0) {
  success.push(`✅ src/**/*.test.ts: ${srcTestFiles.length}個のテストファイルを検出`);
} else {
  warnings.push('⚠️  src/**/*.test.ts: ユニットテストファイルが見つかりません');
}

// examples/*.ts のチェック
const exampleFiles = await glob('examples/*.ts', { cwd: projectRoot });
if (exampleFiles.length > 0) {
  success.push(`✅ examples/*.ts: ${exampleFiles.length}個のサンプルファイルを検出`);
} else {
  errors.push('❌ examples/*.ts: サンプルファイルが見つかりません');
}

// tests/*.test.ts のチェック
const integrationTestFiles = await glob('tests/*.test.ts', { cwd: projectRoot });
if (integrationTestFiles.length > 0) {
  success.push(`✅ tests/*.test.ts: ${integrationTestFiles.length}個の統合テストファイルを検出`);
} else {
  warnings.push('⚠️  tests/*.test.ts: 統合テストファイルが見つかりません');
}

// 2. package.json のチェック
console.log('\n📦 package.json の確認:');
try {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf-8'));
  
  // type: module のチェック
  if (packageJson.type === 'module') {
    success.push('✅ package.json: type: "module" が設定されています');
  } else {
    errors.push('❌ package.json: type: "module" が設定されていません');
  }
  
  // 依存関係のチェック
  const devDeps = packageJson.devDependencies || {};
  const deps = packageJson.dependencies || {};
  const allDeps = { ...deps, ...devDeps };
  
  if (allDeps.vitest) {
    success.push('✅ package.json: vitest が含まれています');
  } else {
    errors.push('❌ package.json: vitest が含まれていません');
  }
  
  if (allDeps.typescript) {
    success.push('✅ package.json: typescript が含まれています');
  } else {
    errors.push('❌ package.json: typescript が含まれていません');
  }
  
  // scripts のチェック
  const scripts = packageJson.scripts || {};
  
  if (scripts.build) {
    if (scripts.build === 'tsdown') {
      success.push('✅ package.json: scripts.build が "tsdown" に設定されています');
    } else {
      warnings.push(`⚠️  package.json: scripts.build が "${scripts.build}" に設定されています（期待値: "tsdown"）`);
    }
  } else {
    errors.push('❌ package.json: scripts.build が定義されていません');
  }
  
  if (scripts.test) {
    if (scripts.test === 'vitest run') {
      success.push('✅ package.json: scripts.test が "vitest run" に設定されています');
    } else {
      warnings.push(`⚠️  package.json: scripts.test が "${scripts.test}" に設定されています（期待値: "vitest run"）`);
    }
  } else {
    errors.push('❌ package.json: scripts.test が定義されていません');
  }
  
  // typecheck スクリプトのチェック
  if (scripts.typecheck) {
    success.push(`✅ package.json: scripts.typecheck が定義されています ("${scripts.typecheck}")`);
  } else {
    warnings.push('⚠️  package.json: scripts.typecheck が定義されていません');
  }
  
} catch (error) {
  errors.push('❌ package.json: ファイルが見つからないか、パースできません');
}

// 3. CLAUDE.md のチェック
console.log('\n📄 CLAUDE.md の確認:');
try {
  await access(path.join(projectRoot, 'CLAUDE.md'));
  success.push('✅ CLAUDE.md: ファイルが存在します');
  
  // Project Goal の存在確認
  const claudeMdContent = await readFile(path.join(projectRoot, 'CLAUDE.md'), 'utf-8');
  if (claudeMdContent.includes('## Project Goal') || claudeMdContent.includes('# Project Goal')) {
    success.push('✅ CLAUDE.md: Project Goal セクションが定義されています');
  } else {
    errors.push('❌ CLAUDE.md: Project Goal セクションが定義されていません');
  }
} catch {
  warnings.push('⚠️  CLAUDE.md: ファイルが見つかりません');
}

// 4. tsconfig.json のチェック
console.log('\n⚙️  tsconfig.json の確認:');
try {
  const tsconfigContent = await readFile(path.join(projectRoot, 'tsconfig.json'), 'utf-8');
  // コメントを含むJSONをパースするため、コメントを除去
  const tsconfigClean = tsconfigContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const tsconfig = JSON.parse(tsconfigClean);
  const compilerOptions = tsconfig.compilerOptions || {};
  
  // allowImportingTsExtensions のチェック
  if (compilerOptions.allowImportingTsExtensions === true) {
    success.push('✅ tsconfig.json: allowImportingTsExtensions: true');
  } else {
    errors.push('❌ tsconfig.json: allowImportingTsExtensions が true に設定されていません');
  }
  
  // moduleResolution のチェック
  if (compilerOptions.moduleResolution === 'bundler') {
    success.push('✅ tsconfig.json: moduleResolution: "bundler"');
  } else {
    errors.push(`❌ tsconfig.json: moduleResolution が "bundler" に設定されていません（現在: "${compilerOptions.moduleResolution}"）`);
  }
  
  // noEmit のチェック
  if (compilerOptions.noEmit === true) {
    success.push('✅ tsconfig.json: noEmit: true');
  } else {
    errors.push('❌ tsconfig.json: noEmit が true に設定されていません');
  }
  
  // esModuleInterop のチェック
  if (compilerOptions.esModuleInterop === true) {
    success.push('✅ tsconfig.json: esModuleInterop: true');
  } else {
    errors.push('❌ tsconfig.json: esModuleInterop が true に設定されていません');
  }
  
} catch (error) {
  errors.push(`❌ tsconfig.json: ファイルが見つからないか、パースできません (${error.message})`);
}

// 5. ビルドのチェック
console.log('\n🏗️  ビルド機能の確認:');
try {
  console.log('  pnpm build を実行中...');
  const buildResult = await $`pnpm build`;
  if (buildResult.exitCode === 0) {
    success.push('✅ pnpm build: ビルドが成功しました');
    
    // dist/index.d.ts の存在確認
    try {
      await access(path.join(projectRoot, 'dist/index.d.ts'));
      success.push('✅ dist/index.d.ts: 型定義ファイルが出力されています');
    } catch {
      errors.push('❌ dist/index.d.ts: 型定義ファイルが見つかりません');
    }
  } else {
    errors.push('❌ pnpm build: ビルドが失敗しました');
  }
} catch (error) {
  errors.push(`❌ pnpm build: ビルドの実行に失敗しました (${error.message})`);
}

// 6. 型チェックの確認
console.log('\n🔍 型チェックの確認:');
try {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf-8'));
  if (packageJson.scripts?.typecheck) {
    console.log('  pnpm typecheck を実行中...');
    const typecheckResult = await $`pnpm typecheck`;
    if (typecheckResult.exitCode === 0) {
      success.push('✅ pnpm typecheck: 型チェックが成功しました');
    } else {
      errors.push('❌ pnpm typecheck: 型チェックが失敗しました');
    }
  } else {
    // typecheckコマンドがない場合は警告のみ（上記で既に警告を出している）
    console.log('  typecheck コマンドが定義されていないためスキップします');
  }
} catch (error) {
  if (error.exitCode !== undefined) {
    errors.push(`❌ pnpm typecheck: 型チェックが失敗しました`);
  } else {
    errors.push(`❌ pnpm typecheck: 型チェックの実行に失敗しました (${error.message})`);
  }
}

// 結果の表示
console.log('\n' + '='.repeat(50));
console.log('📊 チェック結果サマリー:\n');

if (success.length > 0) {
  console.log('✅ 成功項目:');
  success.forEach(s => console.log(`  ${s}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  警告項目:');
  warnings.forEach(w => console.log(`  ${w}`));
}

if (errors.length > 0) {
  console.log('\n❌ エラー項目:');
  errors.forEach(e => console.log(`  ${e}`));
}

console.log('\n' + '='.repeat(50));
console.log(`\n結果: ${errors.length === 0 ? '✅ すべてのチェックをパス' : `❌ ${errors.length}個のエラー`}`);

// エラーがある場合は非ゼロのexit codeで終了
if (errors.length > 0) {
  process.exit(1);
}