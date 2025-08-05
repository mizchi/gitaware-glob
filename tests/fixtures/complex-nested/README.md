# Complex Nested Gitignore Test Fixture

This directory contains a complex test case for nested .gitignore files with various negation patterns.

## Directory Structure

```
complex-nested/
├── .gitignore (root: ignore all *.log, !important.log)
├── logs/
│   ├── .gitignore (ignore *.tmp, !critical.tmp, debug/)
│   ├── app.log (should be ignored by root)
│   ├── important.log (should NOT be ignored - negated in root)
│   ├── data.tmp (should be ignored)
│   ├── critical.tmp (should NOT be ignored - negated locally)
│   └── debug/
│       ├── .gitignore (!trace.log)
│       ├── verbose.log (should be ignored by root)
│       └── trace.log (should NOT be ignored - negated locally)
├── src/
│   ├── .gitignore (ignore build/, !build/keep/, test/)
│   ├── main.js
│   ├── build/
│   │   ├── output.js (should be ignored)
│   │   └── keep/
│   │       ├── .gitignore (!*.min.js)
│   │       ├── bundle.js (should NOT be ignored - parent negated)
│   │       └── app.min.js (should NOT be ignored - double negation)
│   └── test/
│       ├── .gitignore (!*.spec.js, fixtures/)
│       ├── unit.test.js (should be ignored by parent)
│       ├── integration.spec.js (should NOT be ignored - negated)
│       └── fixtures/
│           ├── .gitignore (!important/*)
│           ├── data.json (should be ignored)
│           └── important/
│               └── config.json (should NOT be ignored - negated)
└── docs/
    ├── .gitignore (*.pdf, !manual.pdf, images/, !images/*.png)
    ├── guide.pdf (should be ignored)
    ├── manual.pdf (should NOT be ignored - negated)
    └── images/
        ├── diagram.jpg (should be ignored)
        └── screenshot.png (should NOT be ignored - negated)
```

## Expected Results

Files that should be included (not ignored):
- `logs/important.log`
- `logs/critical.tmp`
- `logs/debug/trace.log`
- `src/main.js`
- `src/build/keep/bundle.js`
- `src/build/keep/app.min.js`
- `src/test/integration.spec.js`
- `src/test/fixtures/important/config.json`
- `docs/manual.pdf`
- `docs/images/screenshot.png`

Files that should be excluded (ignored):
- `logs/app.log`
- `logs/data.tmp`
- `logs/debug/verbose.log`
- `src/build/output.js`
- `src/test/unit.test.js`
- `src/test/fixtures/data.json`
- `docs/guide.pdf`
- `docs/images/diagram.jpg`