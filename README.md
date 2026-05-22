# IMT On-Premise Automation Assets

This repository extracts automation-related assets from the main `imt-on-premise` project into a standalone, shareable package.

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
- `docs/`: deployment references and implementation/spec task files.
- `reports/`: narrative test and automation reports.

## Notes

- `reporting/build_terminology_bug_list.mjs` was adjusted to use repo-relative paths.
- This repository was created as a private GitHub repository by default because the source material references internal environments and operational workflows.
