# Boot License ConfigMap Deployment

## Scope

This document describes how to supply the boot license file to `imt-on-premise` through the existing Helm chart ConfigMap mount.

## Runtime path contract

- The application reads the boot license from `licenses/boot.json`.
- Deployment values must keep `License__BootLicensePath=licenses/boot.json`.
- The mounted file target path must stay `licenses/boot.json`.

## Chart input requirements

- The chart values contract must set `configMapEnabled: True`.
- The chart values contract must set `configMapFile: boot.json`.
- The chart values contract must set `mountFilePath: licenses/boot.json`.
- The chart values contract must set `mountFileSubPath: boot.json`.
- The chart values contract must keep `License__BootLicensePath=licenses/boot.json`.
- The ConfigMap name resolves from the chart `project` value and must render as `${PUBLIC_PROJECT_NAME}-config` in this repository.
- The ConfigMap data key must be `boot.json`.
- The chart render input file must be available at `imt-chart/boot.json`.

## Generate `boot.json`

Run from the repository root:

```bash
dotnet run --project tools/Imt.LicenseTool/Imt.LicenseTool.csproj -- issue-boot \
  --license-id <LICENSE_ID> \
  --company-name "<COMPANY_NAME>" \
  --product-name "IMT Private" \
  --private-key-path <PRIVATE_KEY_PATH> \
  --boot-expires-at <BOOT_EXPIRES_AT> \
  --out ./artifacts/boot.json
```

This produces the real `boot.json` artifact that deployment must mount into the container.

## Workflow requirement before `helm template`

- The deploy repository must contain a pre-generated boot license file at `deploy/boot-license.json`.
- Before `helm template`, the workflow must place a real `imt-chart/boot.json` file in the chart directory.
- In practice, the workflow stages the license with `cp ./deploy/boot-license.json imt-chart/boot.json` and then renders the chart.

## Required file mapping

- Source file for chart rendering: `imt-chart/boot.json`
- ConfigMap name: `${PUBLIC_PROJECT_NAME}-config`
- ConfigMap data key: `boot.json`
- Mounted container path: `licenses/boot.json`

Do not change this mapping unless the application runtime contract also changes.

## Security notes

- Keep the private signing key out of Git.
- Keep the generated `boot.json` license artifact out of Git.
- Treat `deploy/boot-license.json` and the generated license as controlled deployment material.
- The generated boot license is rendered into Kubernetes ConfigMap data, so it is more broadly visible in-cluster than a Secret-backed mount.
- Review cluster and namespace access to ConfigMaps before using this deployment path, and treat the rendered license as controlled deployment material.
