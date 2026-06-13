# Control Plane Staging Implementation Plan

## Goal

Publish the flagship demo to Control Plane staging without adding review apps or
production promotion.

## Tasks

1. Add the staging-only `.controlplane/controlplane.yml` app entry for
   `react-on-rails-demo-flagship-staging`.
2. Add app and Rails workload templates with production Rails env, secret-backed
   `SECRET_KEY_BASE`, port 3000, `/up` probes, and serverless scale-to-zero for
   public-demo cost control.
3. Add a pinned staging GitHub Actions wrapper that calls
   `shakacode/control-plane-flow` at `v5.1.1`.
4. Add a local validation script for the Control Plane GitHub wrapper.
5. Document Control Plane bootstrap, manual deploy, smoke, and required GitHub
   settings.
6. Add `.ruby-version` so cpflow and local tooling infer the Dockerfile's Ruby
   version.
7. Run local readiness, YAML/action lint, app CI, asset build, and Docker smoke
   checks where the local environment allows.
8. Configure required GitHub variables/secrets if available, then bootstrap and
   deploy staging; otherwise report the missing external credential or product
   decision.
