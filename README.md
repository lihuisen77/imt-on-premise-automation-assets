# IMT On-Premise Automation Assets

This repository extracts automation-related assets from the main `imt-on-premise` project into a standalone, shareable package.

## Quick Start

```bash
npm install
./scripts/run-all.sh
```

Generated files are written to `outputs/`.

## What Runs

- `npm run doctor`: checks the repo layout and reports which optional evidence files are absent.
- `npm run build:terminology-bug-list`: generates the terminology bug workbook as `.xlsx`.
- `./scripts/run-all.sh`: installs dependencies if needed, runs diagnostics, and generates the workbook in one step.

## Included

- GitHub Actions deployment workflow and helper script.
- Reporting script used to build the terminology bug workbook.
- Deployment and workflow reference documents.
- Implementation/spec task documents related to workflow automation.
- Automation summary and UI flow test reports.

## Redactions

- Real production secrets, tokens, passwords, and signing material are not included.
- The original `deploy/boot-license.json` is replaced by a safe example file.
- The original production values file is replaced by a template with placeholders.
- Raw screenshots and raw JSON execution artifacts are intentionally excluded.

## Layout

- `.github/workflows/`: CI/CD workflow definitions.
- `.github/scripts/`: workflow helper scripts.
- `deploy/`: sanitized configuration templates.
- `reporting/`: report-generation script and supporting metadata.
- `scripts/`: local setup, diagnostics, and one-click execution scripts.
- `docs/`: deployment references and implementation/spec task files.
- `reports/`: narrative test and automation reports.
- `outputs/`: generated artifacts. Ignored by Git.

See `DIRECTORY_MANIFEST.md` for a fuller inventory.

## Notes

- `reporting/build_terminology_bug_list.mjs` now uses the public `exceljs` package instead of the original internal artifact tooling.
- Missing raw screenshots or JSON evidence do not block workbook generation; the generated links fall back to `reports/imt-private-console-ui/ARTIFACTS_NOT_INCLUDED.md`.
- This repository was created as a private GitHub repository by default because the source material references internal environments and operational workflows.
