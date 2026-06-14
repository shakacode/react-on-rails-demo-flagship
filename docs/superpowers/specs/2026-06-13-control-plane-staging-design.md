# Control Plane Staging Design

## Context

The flagship React on Rails demo already has a deterministic production
container path: the root `Dockerfile` builds assets and the container
entrypoint prepares and seeds SQLite when the Rails server starts. The user
asked to publish the demo to Control Plane like the other demos, but clarified
that the first rollout should be staging only.

## Decision

Add a staging-only Control Plane Flow setup for
`react-on-rails-demo-flagship-staging` in the
`shakacode-open-source-examples-staging` org. Reuse the existing root
`Dockerfile` via `dockerfile: ../Dockerfile` instead of maintaining a second
image definition under `.controlplane/`.

The staging app has one public standard `rails` workload, secret-backed
`SECRET_KEY_BASE`, `/up` readiness and liveness probes, an explicit disabled
autoscaling metric, `capacityAI: true`, and no review-app or production
promotion workflows. The app remains deterministic: it does not add persistent
SQLite volumes, and it lets the existing server entrypoint run
`db:prepare db:seed` on boot.

## Tradeoffs

- Persistent SQLite volumes would preserve user-created demo data, but they
  would also make staging drift from the known six-task demo state and add
  volume ownership concerns with the non-root runtime image.
- Keeping `type: standard` with the autoscaling metric disabled lets Capacity AI
  right-size staging without a standard-to-serverless delete/recreate migration.
  This is not full scale-to-zero; RAM usage can still drive residual cost.
- Public inbound traffic is intentional for this demo, but runtime egress is
  denied because the app serves seeded local data and does not need external
  service calls in normal use.
- Duplicating the Dockerfile under `.controlplane/` would match cpflow's default
  path, but it risks diverging from the container that `bin/smoke` and the
  existing GitHub smoke workflow already validate.
- Staging-only automation is smaller than the standard generated full flow, but
  the config can grow later if review apps or production promotion become a
  deliberate product decision.

## Validation Plan

- Run `cpflow github-flow-readiness`.
- Parse and lint the Control Plane GitHub workflow with
  `bin/test-cpflow-github-flow`.
- Run the existing app CI and asset build checks.
- Build and smoke the Docker image locally when Docker is healthy.
- If credentials are available, bootstrap, deploy, and smoke the staging app.
