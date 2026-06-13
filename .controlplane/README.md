# Control Plane Staging

This repository publishes one staging app:

```text
react-on-rails-demo-flagship-staging
```

The deployment intentionally stays staging-only. It does not create review apps,
production promotion, external databases, or persistent SQLite volumes. The
container entrypoint runs `db:prepare db:seed` whenever the Rails server starts,
so staging returns to the deterministic six-task demo state after each workload
restart or deploy.

The Rails workload is `type: serverless` with `minScale: 0`. That keeps this
public demo from running an always-on idle replica and matches the cost posture
for example and starter apps where occasional cold starts are acceptable. The
first request after an idle period may wait for Rails to boot; change the
workload back to `type: standard` with `minScale: 1` only if the demo needs
always-warm staging latency.

The workload keeps inbound traffic public (`0.0.0.0/0`) because this is a public
demo. Runtime egress is denied by default (`outboundAllowCIDR: []`) because the
app serves its own seeded SQLite data and does not need to call external
services during normal use.

## Prerequisites

```bash
npm i -g @controlplane/cli
gem install cpflow -v 5.1.1
cpln login
```

## First-Time Setup

Create or update the staging secret dictionary:

```bash
cpln secret create-dictionary \
  --name react-on-rails-demo-flagship-staging-secrets \
  --org shakacode-open-source-examples-staging \
  --entry SECRET_KEY_BASE="$(bin/rails secret)"
```

Provision the persistent staging GVC and workload templates:

```bash
cpflow setup-app \
  -a react-on-rails-demo-flagship-staging \
  --org shakacode-open-source-examples-staging \
  --skip-post-creation-hook
```

## Manual Deploy

```bash
cpflow build-image \
  -a react-on-rails-demo-flagship-staging \
  --org shakacode-open-source-examples-staging \
  --commit "$(git rev-parse HEAD)"

cpflow deploy-image \
  -a react-on-rails-demo-flagship-staging \
  --org shakacode-open-source-examples-staging
```

Smoke the deployed app:

```bash
SMOKE_URL="$(
  cpln workload get rails \
    --gvc react-on-rails-demo-flagship-staging \
    --org shakacode-open-source-examples-staging \
    -o json | jq -r '.status.endpoint'
)" bin/smoke
```

## GitHub Actions Setup

Configure these repository settings before relying on automatic staging deploys:

| Name | Type | Value |
| --- | --- | --- |
| `CPLN_TOKEN_STAGING` | Repository secret | Control Plane token scoped to `shakacode-open-source-examples-staging`. |
| `CPLN_ORG_STAGING` | Repository variable | `shakacode-open-source-examples-staging` |
| `STAGING_APP_NAME` | Repository variable | `react-on-rails-demo-flagship-staging` |

The staging workflow runs on pushes to `main` and manual dispatches. It builds
with the existing root `Dockerfile` through `.controlplane/controlplane.yml`'s
`dockerfile: ../Dockerfile` setting.

If this app is ever promoted from a public demo to a user-facing availability
target, revisit the serverless scale-to-zero setting before enabling production
promotion or uptime monitoring.
