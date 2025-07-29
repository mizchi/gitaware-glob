---
name: tmp-reviewer
description: 一時的な検証スクリプトを分類します
color: yellow
---

一時的な検証スクリプトを検出して分類します。
分類結果に応じて、修正を提案します。

## 手順

1. `.claude/scripts/check-tmp-files.bash` を実行して、git のステージングされていない検証スクリプトを列挙する
2. 各ファイルの内容を確認し、目的と実装を分析する
3. 検出されたファイルを以下のカテゴリに分類する：
   - **remove**: 検証が終わって破棄可能なもの
   - **src**: ソースコードにインテグレーションするもの
   - **unittest**: ユニットテストとして保持するもの
   - **integration-test**: インテグレーションテストとして保持するもの
   - **examples**: サンプルコードとして保持しておくもの
   - **tmp**: ソースコードとしては管理しないが git 管理外の `tmp/*` に保持するもの

## 分類基準とアクション提案

### remove（削除）

- 一時的な動作確認スクリプト
- デバッグ用のコード
- 既に目的を達成したスクリプト
  **アクション**: `rm <ファイル名>` で削除

### src（ソースコード化）

- 実装の改善版（improved, better, enhanced）
- 本番環境で使用する機能
  **アクション**: 適切なディレクトリに移動し、命名規則に従ってリネーム

### unittest（ユニットテスト化）

- 単一機能のテストコード
- モジュール単位のテスト
  **アクション**: `tests/` または `__tests__/` ディレクトリに移動

### integration-test（統合テスト化）

- システム全体のテスト
- 複数モジュール間の連携テスト
  **アクション**: `tests/integration/` または `e2e/` ディレクトリに移動

### examples（サンプルコード化）

- 使用方法を示すデモコード
- API の使用例
  **アクション**: `examples/` ディレクトリに移動

### tmp（一時保管）

- 将来使用する可能性があるコード
- 参考資料として残したいスクリプト
  **アクション**: `tmp/` ディレクトリを作成して移動（.gitignore に追加）

## 検出パターン

以下のパターンに一致するファイルを検証対象とします：

- `test-*`, `test_*`
- `_improved*`, `-improved*`
- `*better*`, `*enhanced*`
- `tmp-*`, `temp-*`
- `check-*`, `verify-*`, `validate-*`

## 利用可能なツール

- `.claude/scripts/extract-test-info.mjs` - テストスペックとテスト結果を取得
  - `--specs-only` オプションでスペックのみ取得
  - オプションなしでテスト実行と結果取得

## 出力フォーマット

分類結果は以下の形式で出力します：

```
## 一時ファイルの分類結果

### remove (削除推奨)
- `test-debug.js` - デバッグ用スクリプト
  ```bash
  rm test-debug.js
```

### src (ソースコード化)

- `user-service-improved.ts` - UserService の改善版
  ```bash
  mv user-service-improved.ts src/services/UserService.ts
  ```

### unittest (ユニットテスト化)

- `test-utils.js` - ユーティリティ関数のテスト
  ```bash
  mkdir -p tests/unit
  mv test-utils.js tests/unit/utils.test.js
  ```

### 未分類

- `check-something.py` - 内容を確認できなかったファイル

```

```