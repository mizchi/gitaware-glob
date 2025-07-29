プロジェクトのゴールや必要とする要件をブラックボックステストや現在の実装と照らし合わせて、仕様やインテグレーションテストを更新します。

## Steps

- Run `.claude/scripts/check-prereview.mjs` to check project structure
- Parralel with Sub Agents
  - Review `dist/index.d.ts` with smoke-pubilc-api-reviewer
  - Review `examples/*.ts` with smoke-examples-reviewer
  - Review `tests/*.test.ts` with smoke-integration-reviewer

## Propose

- 新しい Project Goal
- 追加/削除/更新するインテグレーションテストを提案
- 公開 API のメソッドの提案
