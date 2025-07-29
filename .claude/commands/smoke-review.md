ユーザー視点でこのライブラリを振る舞いをレビューします。

実装を見ずに、型定義、examples のサンプルコード、tests のインテグレーションテストを評価します。

## Steps

- Run `.claude/scripts/check-prereview.mjs` to check project structure
- Parralel with Sub Agents
  - Review `dist/index.d.ts` with smoke-pubilc-api-reviewer
  - Review `examples/*.ts` with smoke-examples-reviewer
  - Review `tests/*.test.ts` with smoke-integration-reviewer
