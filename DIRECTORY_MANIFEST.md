# Directory Manifest

## Top Level

- `.github/`
  CI/CD workflow and helper automation copied from the source project.
- `deploy/`
  Sanitized deployment configuration examples and templates.
- `docs/`
  Deployment references plus workflow design and implementation notes.
- `reporting/`
  Local report-generation code.
- `reports/`
  Human-readable automation reports and artifact notes.
- `scripts/`
  Setup, diagnostics, and one-click execution scripts for this extracted repo.
- `outputs/`
  Generated deliverables such as `.xlsx` reports. This directory is created on demand and ignored by Git.

## Key Files

- `package.json`
  Node entrypoint for local automation tasks.
- `scripts/run-all.sh`
  One-click local runner.
- `scripts/doctor.mjs`
  Repo health check for required and optional inputs.
- `reporting/build_terminology_bug_list.mjs`
  Generates the terminology bug workbook.
- `reports/imt-private-console-ui/ARTIFACTS_NOT_INCLUDED.md`
  Explains which original raw artifacts were intentionally left out of this repo.
