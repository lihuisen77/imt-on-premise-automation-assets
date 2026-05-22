# GitHub Workflow Deployment Env Reference

## Scope

This document tells implementers which backend keys must be configured for the GitHub workflow deployment path.

## Frontend build mode

- The workflow builds the frontend with `VITE_CONSOLE_ADAPTER_MODE=integrated`.
- In integrated mode, the console uses same-origin `/api` requests.
- No additional `VITE_CONSOLE_API_BASE_URL`, `VITE_CONSOLE_MOCK_SERVER_URL`, or `VITE_CONSOLE_APP_BASENAME` override is required for the current deployment path.

## Required backend env keys

- `Mongo__ConnectionString`: MongoDB connection string for the target environment.
- `Mongo__DatabaseName`: Mongo database name for the target environment.
- `Redis__ConnectionString`: Redis connection string for the target environment.
- `Redis__Mode`: Redis deployment mode. Default is `standalone` unless the environment requires another supported mode.
- `Redis__ServiceName`: Redis service name when the selected mode requires it.
- `Redis__TlsServerName`: TLS server name when Redis TLS is enabled.
- `Redis__Database`: Redis logical database index.
- `License__BootLicensePath`: Path inside the container or mounted filesystem to the boot license file.
- `License__PublicKeyPath`: Path inside the container or mounted filesystem to the license verification public key.
- `Jwt__Issuer`: JWT issuer string used by the API.
- `Jwt__Audience`: JWT audience string used by the API.
- `Jwt__JwtSigningKey`: JWT signing key. Configure through a secret-backed value.
- `Security__ApiKeyPepper`: Pepper used for hashing API keys. Configure through a secret-backed value.
- `Recovery__BOOTSTRAP_ADMIN_TOKEN`: Bootstrap recovery token. Configure through a secret-backed value.
- `Recovery__RECOVERY_ADMIN_TOKEN`: Recovery admin token. Configure through a secret-backed value.

## Secret-backed keys

These values should come from Kubernetes secrets, not plaintext committed values:

- `Jwt__JwtSigningKey`
- `Security__ApiKeyPepper`
- `Recovery__BOOTSTRAP_ADMIN_TOKEN`
- `Recovery__RECOVERY_ADMIN_TOKEN`
- Usually `Mongo__ConnectionString` and `Redis__ConnectionString` as well

## Explicitly excluded for now

- `DocumentApi__BaseUrl`
- `DocumentApi__DocumentApiKey`

These are intentionally excluded from the current deployment template scope.
