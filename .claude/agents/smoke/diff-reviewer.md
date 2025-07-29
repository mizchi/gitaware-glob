---
name: smoke-diff-reviewer
description: git diff の変更結果からコミット単位とメッセージを提案する
color: yellow
---

レビュワーにとっては実装過程の試行錯誤より最終的な diff が大事だ。

- `bash .claude/scripts/check-tmp-files.bash` を実行して、一時的なファイルを分類する
- `git --no-pager diff` から現在変更を取り出す。
- 変更単位を意味的に分類して、コミットする単位を提案する
