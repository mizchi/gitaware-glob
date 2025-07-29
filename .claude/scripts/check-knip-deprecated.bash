#!/bin/bash
# knipを使用してデッドコードを検出するスクリプト

set -e

# スクリプトの実行ディレクトリからプロジェクトルートへ移動
cd "$(dirname "$0")/.."

echo "=== Knip Dead Code Detection ==="
echo ""

# knipが利用可能か確認
if ! command -v knip &> /dev/null && ! npx knip --version &> /dev/null; then
    echo "Error: knip is not installed"
    echo "Run: pnpm add -D knip"
    exit 1
fi

# 結果を保存する一時ファイル
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

# knipを実行してJSON形式で結果を取得
echo "Running knip analysis..."
npx knip --reporter json > "$TEMP_FILE" 2>/dev/null || true

# jqを使って結果を整形
if command -v jq &> /dev/null; then
    # 各カテゴリの問題を抽出
    echo "## Unused Files"
    jq -r '.files[]? | "- \(.)"' "$TEMP_FILE" 2>/dev/null || echo "None"
    
    echo ""
    echo "## Unused Dependencies"
    jq -r '.dependencies[]? | "- \(.)"' "$TEMP_FILE" 2>/dev/null || echo "None"
    
    echo ""
    echo "## Unused Dev Dependencies"
    jq -r '.devDependencies[]? | "- \(.)"' "$TEMP_FILE" 2>/dev/null || echo "None"
    
    echo ""
    echo "## Unused Exports"
    jq -r '.exports | to_entries[]? | "- \(.key): \(.value[])"' "$TEMP_FILE" 2>/dev/null || echo "None"
    
    echo ""
    echo "## Unused Types"
    jq -r '.types | to_entries[]? | "- \(.key): \(.value[])"' "$TEMP_FILE" 2>/dev/null || echo "None"
    
    echo ""
    echo "## Duplicate Exports"
    jq -r '.duplicates | to_entries[]? | "- \(.key): \(.value[])"' "$TEMP_FILE" 2>/dev/null || echo "None"
    
    # サマリー
    echo ""
    echo "=== Summary ==="
    TOTAL_ISSUES=$(jq -r '
        ((.files // []) | length) +
        ((.dependencies // []) | length) +
        ((.devDependencies // []) | length) +
        ((.exports // {} | to_entries | map(.value | length) | add) // 0) +
        ((.types // {} | to_entries | map(.value | length) | add) // 0) +
        ((.duplicates // {} | to_entries | map(.value | length) | add) // 0)
    ' "$TEMP_FILE" 2>/dev/null || echo "0")
    
    echo "Total issues found: $TOTAL_ISSUES"
    
    if [ "$TOTAL_ISSUES" -eq "0" ]; then
        echo "✅ No dead code detected!"
    else
        echo "⚠️  Dead code detected. Consider removing unused code."
    fi
else
    # jqがない場合は生の出力
    echo "jq not found. Showing raw knip output:"
    npx knip
fi