ユーザーのリクエストから、T_WADA の TDD でプロジェクトの仕様を考えます。

## Request

$ARGUMENTS

## 仕様の整合性の検証

現在のインテグレーションテストから、仕様の一覧を取得して、仕様レベルで整合性を考えます

```bash
bash .claude/scripts/get-vitest-specs.bash
```

他の仕様への影響を考えて、影響の有無を予測します。

## 実行ステップ

- Optional: RESEARCH
- Spec: tests の作成
- TDD Cycle
  - RED
  - GREEN
  - REFACTOR
- Diff Review

## Optional: Research

実装方法が不明瞭な場合、実装検証のために `tmp/*` で一時的な検証スクリプトを作成し、実行結果を検証します。

## Spec

`tests/*.test.ts` で失敗するテストコードを作成します。

最初に型シグネチャだけを設計して、実装は `new Error()` のプレースホルダーとします。型チェックが通ることを確認します。

```ts
function newFeature() {
  // WIP
}
describe("<name>", () => {
  it("<spec>", () => {
    const expected = {};
    const output = newFeature();
    expect(output).toEqual(expected);
  });
});
```

## TDD Cycle

t-wada の TDD サイクルを回します。
