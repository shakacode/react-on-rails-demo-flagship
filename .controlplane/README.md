# Control Plane Deployment Flow

This repository uses `cpflow` for opt-in pull-request review apps, automatic
staging deploys from `main`, and manual promotion from staging to production.
The generated GitHub Actions use `cpflow` v5.3.0 and pin the immutable release
commit `b1e5ff4a04adfccfd8b59996e8abdbb5defb3fd6`; see
[`.github/cpflow-help.md`](../.github/cpflow-help.md) for the complete commands,
settings, and upgrade procedure. After regenerating wrappers for a future
release, repin them with `bin/pin-cpflow-github-ref <release-commit-sha>`, then
update the recorded release and commit in this file and `.github/cpflow-help.md`.

## Runtime Shape

The same image runs two standard workloads: public Rails and an internal Pro
Node renderer. Both use one warm replica with disabled autoscaling and Capacity
AI. Rails can reach `node-renderer.<app>.cpln.local:3800`; the renderer has no
public ingress, and neither workload needs runtime Internet egress.

This is a deterministic public demo, not a persistent data service. Its
entrypoint runs `db:prepare db:seed` whenever Rails starts, so review, staging,
and production return to the six-task sample state after each restart or
deploy. No external database or persistent SQLite volume is provisioned.

## One-Time Bootstrap

Install the clients and create a shared review-app dictionary before enabling
review deployments:

```sh
npm install --global @controlplane/cli
gem install cpflow -v 5.3.0
cpln login

cpln secret create-dictionary \
  --name react-on-rails-demo-flagship-review-secrets \
  --org "$CPLN_ORG_STAGING" \
  --entry "SECRET_KEY_BASE=$(bin/rails secret)" \
  --entry "RENDERER_PASSWORD=$(ruby -rsecurerandom -e 'puts SecureRandom.hex(32)')"
```

Review apps execute pull-request code. Keep this dictionary disposable and do
not reuse staging, production, license, or third-party credentials in it.

Bootstrap the persistent staging and production GVCs before their first deploy:

```sh
cpflow setup-app \
  -a react-on-rails-demo-flagship-staging \
  --org "$CPLN_ORG_STAGING" \
  --skip-post-creation-hook

cpflow setup-app \
  -a react-on-rails-demo-flagship-production \
  --org "$CPLN_ORG_PRODUCTION" \
  --skip-post-creation-hook
```

Populate distinct `SECRET_KEY_BASE` and `RENDERER_PASSWORD` values in the
generated staging and production app dictionaries. For later template changes,
apply all workload templates again and ensure each app identity can `reveal`
its app secret policy:

```sh
cpflow apply-template \
  -a react-on-rails-demo-flagship-staging \
  --org "$CPLN_ORG_STAGING" \
  app rails node-renderer

cpflow apply-template \
  -a react-on-rails-demo-flagship-production \
  --org "$CPLN_ORG_PRODUCTION" \
  app rails node-renderer
```

## GitHub Configuration

Store `CPLN_TOKEN_STAGING` as a repository secret. Set these repository
variables:

| Name | Value |
| --- | --- |
| `CPLN_ORG_STAGING` | Staging Control Plane organization |
| `STAGING_APP_NAME` | `react-on-rails-demo-flagship-staging` |
| `PRIMARY_WORKLOAD` | `rails` |

The review prefix is inferred from `.controlplane/controlplane.yml` unless
`REVIEW_APP_PREFIX` overrides it.

Create a protected `production` GitHub Environment with required reviewers and
self-review disabled. Store `CPLN_TOKEN_PRODUCTION` only as an Environment
secret, and set `CPLN_ORG_PRODUCTION` and
`PRODUCTION_APP_NAME=react-on-rails-demo-flagship-production` there as
Environment variables. Do not create a repository or organization secret named
`CPLN_TOKEN_PRODUCTION`.

## Manual Staging Deploy

```sh
cpflow build-image \
  -a react-on-rails-demo-flagship-staging \
  --org "$CPLN_ORG_STAGING" \
  --commit "$(git rev-parse HEAD)"

cpflow deploy-image \
  -a react-on-rails-demo-flagship-staging \
  --org "$CPLN_ORG_STAGING"
```

Use `bin/smoke` against the Rails workload endpoint after deployment.
