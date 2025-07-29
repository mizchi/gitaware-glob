#!/bin/bash
# vitestのテスト一覧を取得するスクリプト

set -e

# スクリプトの実行ディレクトリからプロジェクトルートへ移動
cd "$(dirname "$0")/../.."
PROJECT_ROOT=$(pwd)

# 一時ファイルにテスト結果を保存
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

# tests/ディレクトリが存在するか確認
if [ -d "tests" ]; then
    # tests/ディレクトリのテストのみをJSON形式で実行
    npx vitest run tests --reporter=json > "$TEMP_FILE" 2>/dev/null || true
else
    # tests/ディレクトリがない場合は全体を実行
    npx vitest run --reporter=json > "$TEMP_FILE" 2>/dev/null || true
fi

# jqを使ってテスト情報を整形
if command -v jq &> /dev/null; then
    jq -r --arg root "$PROJECT_ROOT" '
      .testResults | 
      group_by(.name) | 
      .[] | 
      .[0] as $suite |
      "\n\($suite.name | sub($root + "/"; ""))" +
      ($suite.assertionResults | 
        group_by(.ancestorTitles[0] // "") |
        map(
          if .[0].ancestorTitles[0] then
            "\n  \(.[0].ancestorTitles[0])" +
            (map("\n    - \(.title) [\(.status)]") | join(""))
          else
            map("\n  - \(.title) [\(.status)]") | join("")
          end
        ) | join("")
      )
    ' "$TEMP_FILE" 2>/dev/null
else
    echo "Error: jq is required"
    exit 1
fi