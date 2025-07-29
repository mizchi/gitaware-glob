# coverage-review

テストカバレッジを分析し、不足しているテストケースを特定して新しいテストの追加を提案します。

## 計測

これらを実行して集津力結果を確認します

```
pnpm test:coverage
node .claude/scripts/get-coverage-for-file.mjs
```

## 提案

テストカバレッジを増やすためのテストを提案します
