# AGENTS.md

## Agent Workflow Configuration

Portable shared skills resolve this repo's commands and policy through:
- **Commands** — run `.agents/shaka/bin/<name>` (`setup`, `validate`, `test`, ...); see `.agents/bin/README.md`. A missing script means that capability is n/a here.
- **Policy / config** — `.agents/shaka/config.yml`.

## React on Rails guidance

For React on Rails setup, rendering, RSC, or upgrade work, locate the installed,
version-matched guide with `bundle show react_on_rails` and read
`docs/agent/README.md` under that gem directory. Follow its pointers to the
relevant packaged skills; keep this repository's workflow seam and hosted
validation requirements in force. Repository and user instructions take
precedence over packaged guidance.

This demo uses React on Rails Pro. Evaluation and non-production use may run
without a license token; production use requires an appropriate paid or
Complimentary OSS license. See the licensing terms linked from `README.md`.

## Hosted upgrade validation

Before merging dependency or rendering upgrades, open the hosted PR review app
and exercise streaming, hydration, persisted mutations, validation feedback, and
CSRF rejection. Record its URL, exact deployed PR head, results, and screenshot on
the PR. Require `hosted-review / Hosted review app` on that head. Missing deployment
identity, unhealthy rollout, or failed browser behavior blocks Auto merge.
After merge, verify staging serves the merge revision at `/__deployment` and
passes the hosted checks before reporting the upgrade delivered.
