# Repository Governance

This document captures the recommended organization-facing metadata and permission model for this repository.

## Recommended GitHub Metadata

- Repository name: `imt-on-premise-automation-assets`
- Description:
  `Automation workflows, deployment references, and report-generation assets for IMT on-premise operations.`
- Topics:
  - `imt`
  - `automation`
  - `deployment`
  - `reporting`
  - `github-actions`
  - `on-premise`
- Homepage:
  Leave empty unless a stable internal or public landing page exists.

## Visibility Guidance

- Default visibility recommendation: `public`
- Keep the repository `public` only if all included materials remain sanitized.
- If raw screenshots, environment URLs, credential-bearing configs, or internal run outputs are added later, re-evaluate whether the repository should become `private`.

## Permission Guidance

- `admin`:
  Limit to a small group that owns repository naming, transfer, visibility, branch protection, and metadata changes.
- `write`:
  Grant to maintainers who update scripts, docs, and extracted assets.
- `read`:
  Use for broader organization members who only need to discover or reuse the repository.

## Suggested Team Model

- A small platform or ops team should hold `admin`.
- Day-to-day maintainers should hold `write`.
- Wider engineering or documentation audiences can stay on org-default read access if the repository remains public.

## Review Checklist

- Description still matches the actual scope.
- Topics still make the repository discoverable in the organization.
- Visibility still matches the sensitivity of included artifacts.
- At least one admin-capable maintainer is assigned.
- README quick start still reflects the current runnable commands.
