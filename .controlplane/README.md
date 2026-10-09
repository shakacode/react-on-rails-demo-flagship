# Control Plane Staging

This repository publishes one staging app:

```text
react-on-rails-demo-flagship-staging
```

The deployment stays in the staging organization. It also supports disposable PR
review apps, without production promotion, external databases, or SQLite volumes. The
container entrypoint runs `db:prepare db:seed` whenever the Rails server starts,
so staging returns to the deterministic six-task demo state after each workload
restart or deploy.

New apps use `type: standard` with the autoscaling metric disabled and
`capacityAI: true`. The existing staging Rails workload is serverless; preserve
that type when refreshing its configuration. Changing its type requires a
separate migration. The Node renderer port uses `http2`, matching the renderer's
HTTP/2 server; `http` causes upstream protocol errors through the service mesh.

The Rails workload keeps inbound traffic public (`0.0.0.0/0`) because this is a
public demo. Runtime egress is denied by default (`outboundAllowCIDR: []`)
because the app serves its own seeded SQLite data and does not need to call
external services during normal use. The Node renderer blocks public ingress but
allows same-GVC internal traffic so Rails can reach
`node-renderer.<app>.cpln.local:3800`.

## Prerequisites

```bash
npm i -g @controlplane/cli
gem install cpflow -v 6.0.0
cpln login
```

## First-Time Setup

Create or update the staging secret dictionary:

```bash
cpln secret create-dictionary \
  --name react-on-rails-demo-flagship-staging-secrets \
  --org shakacode-open-source-examples-staging \
  --entry SECRET_KEY_BASE="$(bin/rails secret)" \
  --entry RENDERER_PASSWORD="$(ruby -rsecurerandom -e 'puts SecureRandom.hex(32)')"
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
target, revisit the disabled autoscaling metric and Capacity AI posture before
enabling production promotion or uptime monitoring.

## Hosted validation and review apps

Each PR must pass `hosted-review / Hosted review app`: both workloads must use
images ending in the full PR SHA, their latest rollout must be ready, and
`/__deployment` must report that SHA over the public URL. The existing browser
suite then checks streamed HTML, hydration, persisted mutations, validation, and
CSRF rejection. Screenshots, failure traces, and deployment metadata are uploaded
as Actions artifacts. The automated gate applies to every PR; upgrades additionally
require a manual browser visit and PR evidence as described in `AGENTS.md`.
The staging workflow runs the same verification after deployment; updating an
image alone no longer completes the staging workflow successfully.

Review apps use the `react-on-rails-demo-flagship-review` prefix and a separate
review-only secret dictionary. Populate its `SECRET_KEY_BASE` and
`RENDERER_PASSWORD` with generated values before the first review app. Keep the
staging secret dictionary separate. Bootstrap a PR app with:

```bash
cpflow setup-app -a react-on-rails-demo-flagship-review-PR_NUMBER \
  --org shakacode-open-source-examples-staging --skip-post-creation-hook
```

Then rerun the PR's Review app workflow. Subsequent pushes deploy automatically.
Fork and Dependabot PRs do not receive Actions secrets. Review those changes and
publish them on a maintainer branch before hosted validation; do not expose the
staging token to an untrusted PR.
The upstream wrapper deliberately skips initial creation on PR events; missing
apps fail the hosted verification rather than counting as a tested deployment.
Delete the disposable app with `cpflow delete -a APP_NAME --org ORG` after
the PR closes. Preserve the review-only dictionary while other review apps use it.

For an existing staging GVC, refresh only the app template to repair renderer
environment settings and the renderer template to repair its HTTP/2 port,
preserving the deployed images:

```bash
cpflow apply-template app node-renderer -a react-on-rails-demo-flagship-staging \
  --org shakacode-open-source-examples-staging --preserve-existing-runtime --yes
```

Confirm both workloads restart with the new environment. The existing Rails
workload is serverless; changing it to the standard template is a separate
infrastructure migration. Reapplying all workload templates fails on that type change.

The check executes repository code with staging credentials, like the existing
deployment workflow. It is a runtime qualification gate, not a security boundary:
review changes to workflows and validation scripts before trusting their results.
