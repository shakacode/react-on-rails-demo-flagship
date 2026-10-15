# AGENTS.md

## Agent Workflow Configuration

Portable shared skills resolve this repo's commands and policy through:
- **Commands** — run `.agents/bin/<name>` (`setup`, `validate`, `test`, ...); see `.agents/bin/README.md`. A missing script means that capability is n/a here.
- **Policy / config** — `.agents/agent-workflow.yml`.

## Hosted upgrade validation

Before merging dependency or rendering upgrades, open the hosted PR review app
and exercise streaming, hydration, persisted mutations, validation feedback, and
CSRF rejection. Record its URL, exact deployed PR head, results, and screenshot on
the PR. Require `hosted-review / Hosted review app` on that head. Missing deployment
identity, unhealthy rollout, or failed browser behavior blocks Auto merge.
After merge, verify staging serves the merge revision at `/__deployment` and
passes the hosted checks before reporting the upgrade delivered.
