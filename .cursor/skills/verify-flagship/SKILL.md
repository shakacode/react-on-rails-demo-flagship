---
name: verify-flagship
description: "Launch, drive, and prove the React on Rails Pro flagship demo (Rails + Pro Node renderer + RSC streaming) through its browser UI: the task board at / and the /slow streaming page. Use when you need evidence that a change to this repo still renders, hydrates, mutates tasks, or streams late Suspense boundaries the way a user sees it."
---

# Verify the flagship demo

The user surface is a browser web UI served by Rails: the **Flagship Task Board** at `/` (streamed RSC board, Redux-backed create/move/delete through `/api/tasks`) and the development-only **Slow Section** at `/slow`. Secondary surfaces, not driven here: the JSON API itself, `docker compose` (see `README.md`), and hosted review apps (see `AGENTS.md`).

Everything goes through one helper, run from the repo root:

```bash
.cursor/skills/verify-flagship/scripts/verify-flagship launch      # start an isolated instance
.cursor/skills/verify-flagship/scripts/verify-flagship doctor      # is it ours and healthy?
.cursor/skills/verify-flagship/scripts/verify-flagship drive create
.cursor/skills/verify-flagship/scripts/verify-flagship cleanup     # stop it; evidence stays
```

Read [`features/README.md`](features/README.md) before driving; each feature file is the recipe and the pass criteria.

## Launch

Prerequisites, once per checkout: `bundle install`, `npm install`, and `npx playwright install chromium` (the driver uses the repo's `@playwright/test`). Ruby 3.4.9, Node 20.19+/22.12+, `overmind` or `foreman`, and `lsof`, `pgrep`, `curl`, and `sqlite3` on `PATH`. The helper stops with `missing required tools` if one is absent.

**Platform:** this skill is proven on macOS only. Its process checks read `lsof` and `ps -o lstart=`, and Linux is untested, so run a full launch, drive, and cleanup there before relying on its isolation guarantees.

```bash
.cursor/skills/verify-flagship/scripts/verify-flagship launch                 # bin/dev (HMR), as in README
.cursor/skills/verify-flagship/scripts/verify-flagship launch --mode static   # bin/dev static (extracted CSS)
.cursor/skills/verify-flagship/scripts/verify-flagship launch --base-port 4720
```

Launch does, in order:

1. Refuses if a Rails server from this checkout is already running (`tmp/pids/server.pid`), or if any of `~/.overmind.env`, `.overmind.env`, `.env`, or `.foreman` exists. Overmind and foreman load those files over the run's exports, and the files can chain further files, so the run loads none of them. Launch also drops every inherited `OVERMIND_*` variable before setting its own socket. Picks the first free Rails/webpack/renderer port block from 4710 upward (`REACT_ON_RAILS_BASE_PORT`), never 3000.
2. Creates a run under `tmp/verify-flagship/runs/<RUN_ID>/` and an evidence dir `tmp/verify-flagship/evidence/<RUN_ID>/`.
3. Exports `ALLOW_DEMO_RENDERER_PASSWORD=true`, `DATABASE_URL=sqlite3:<run>/verify.sqlite3`, `REACT_ON_RAILS_BASE_PORT`, and `OVERMIND_SOCKET=/tmp/verify-flagship-<RUN_ID>.sock`, then runs `bin/rails db:prepare db:seed` against the empty run DB (six seeded tasks).
4. Starts `bin/dev --no-open-browser` (or `bin/dev static --no-open-browser`) in the background, logging to `<run>/bin-dev.log`.
5. Waits up to 300 s (`VERIFY_FLAGSHIP_READY_TIMEOUT`) until `bin/smoke` passes against the run's URL.

**Ready** is the line `==> READY run=<RUN_ID> mode=<mode> url=http://localhost:<port>`. It means `bin/smoke` found `data-testid="task-card"` markup and the seeded title inside rendered `<h3>` markup in the raw streamed HTML. Smoke prints the card count but does not require six; `drive board` enforces the exact count. `/up` answering 200 alone is not ready: it passes before the Pro renderer and bundles can serve the board.

Use `--mode static` for any journey that blocks client JavaScript (the `/slow` no-FOUC check). In HMR mode the dev server injects CSS with JavaScript, so a no-JS page is unstyled by design.

Teardown is [Cleanup](#cleanup).

## Doctor

```bash
.cursor/skills/verify-flagship/scripts/verify-flagship doctor [RUN_ID]
```

Read-only. Run it first, and again whenever anything looks off. It must end with `doctor: healthy`; otherwise do not drive. It checks that:

- the `bin/dev` PID launch started is alive, with the same start time launch recorded;
- every listener on the Rails port, the renderer port, and (in HMR mode) the webpack port is a process launch recorded, or descends from one, and the Rails listener runs from this checkout;
- `/api/tasks` serves exactly the rows in this run's SQLite file, so the instance isn't using `storage/development.sqlite3`;
- `/__deployment` reports the `react_on_rails_pro` version pinned in `Gemfile.lock`;
- `HEAD` still matches the commit recorded at launch;
- `bin/smoke` still passes.

## Drive

```bash
.cursor/skills/verify-flagship/scripts/verify-flagship drive <board|create|update|delete|slow> [RUN_ID]
```

`drive` first runs Doctor and refuses to touch an instance that fails it. It then runs [`scripts/drive.mjs`](scripts/drive.mjs) in headless Chromium against the run's URL, and reseeds the run DB (`bin/rails db:seed`, which converges to the six seeded tasks) so the next drive starts from the baseline. Exit code 0 means every check passed; each check prints as `[ok]` or `[FAIL]` with its observed value.

Selectors are the app's own stable hooks; never use coordinates or DOM position:

| Handle | Where |
| --- | --- |
| `data-testid="tasks-app"`, `task-board`, `column-todo`, `column-doing`, `column-done` | board container and columns (`TaskBoard.tsx`) |
| `data-testid="task-card"` + its `<h3>` heading (task title) | one card (`TaskCard.tsx`) |
| `data-testid="new-task-form"` with labels `Task title`, `Task notes`, button `Add task` | create form (`NewTaskForm.tsx`) |
| label `Status for <title>` (a `<select>`), button `Delete` inside the card | move and delete (`TaskCard.tsx`) |
| `data-testid="error-banner"` (`role="alert"`), button `Dismiss` | visible error state (`ErrorBanner.tsx`) |
| `data-testid="ssr-meta"`, `ssr-timestamp` | server-render stamp |
| `[data-slow-stats-panel]`, heading `Stats loaded after <N>ms` | late Suspense panel on `/slow` (`SlowStatsPanel.tsx`) |

The components live under `app/javascript/src/`, not `client/` (which holds only `node-renderer.js`). Use `verify-flagship reseed` for an extra restore if you drove the UI by other means.

## Evidence

Every drive writes to `tmp/verify-flagship/evidence/<RUN_ID>/<feature>/`:

- `*.png`: full-page screenshots, before and after each action;
- `*.aria.txt`: ARIA snapshots of the same states;
- `network.json`: every `/api/*` request, whether the page made it (`via: "page"`) or the driver did as a read-only second view (`via: "api-request-context"`), with method, status, whether `X-CSRF-Token` was sent, and request and response bodies;
- `result.json`: feature, run ID, URL, git HEAD, each check with its observed value, console and page errors, and an overall `passed`;
- `streamed.html`: the raw server response, for board and slow.

Cleanup adds `launch-bin-dev.log`, `launch-db-setup.log`, and `launch-smoke.log` to the run's evidence root. `tmp/` is gitignored: to put a proof in a PR, attach the screenshots and paste the `result.json` checks, never commit them.

Proof standards:

- Drive the real user path: the form, the select, the button. Never seed rows or call internal setters to fake a state. Direct API calls are allowed only as a second, read-only view (`GET /api/tasks`) or where the feature file says so.
- Capture the action and the resulting state, not just the final screen.
- Verify the side effect as well as what is visible: the API response status, the CSRF header, the state after a full reload, and the stored row.
- Treat any console or page error as a failure, unless the feature file names it as expected and the driver asserts it.
- No mocks. The only interception is aborting script requests on `/slow`, which is the point of that journey.

## Cleanup

```bash
.cursor/skills/verify-flagship/scripts/verify-flagship cleanup [RUN_ID]
```

Cleanup stops only what launch started; it never kills by process name. Launch records each process it starts in `<run>/owned.tsv` as PID, start time, and role: `bin/dev`, the overmind or foreman process, overmind's tmux server, and the port listeners that descend from them. A PID is signalled only while its start time still matches, so a reused PID or a later process on the same port is left alone.

1. Copies the launch logs into the evidence dir.
2. Sends TERM to `bin/dev`. This comes first because ReactOnRails' process manager falls back to foreman and restarts everything when overmind exits under a live `bin/dev`.
3. Runs `overmind quit -s <run socket>`, or sends TERM to foreman when there is no overmind socket.
4. Waits up to 45 s for every recorded process to exit; the node renderer drains last, which takes about 20 s. Then sends TERM to any recorded process still running, and fails if one survives.
5. Reports any process still holding a run port and leaves it alone; such a process was not started by this run, and cleanup fails until the port is free.
6. Deletes the run dir (DB and state) and the socket.
7. Prints the surviving evidence files. It fails if the evidence dir is missing.

Run cleanup after every failed launch or drive too. `verify-flagship status` lists runs that still have state, and evidence dirs.

## Helpers

- [`scripts/verify-flagship`](scripts/verify-flagship) (bash): `launch`, `doctor`, `drive`, `reseed`, `cleanup`, `status`. Running it with no arguments prints usage. `RUN_ID` defaults to the latest launch, stored in `tmp/verify-flagship/current`.
- [`scripts/drive.mjs`](scripts/drive.mjs) (Node ESM, Playwright `chromium`): one function per feature. Run it through `verify-flagship drive`, which sets `VERIFY_BASE_URL`, `VERIFY_EVIDENCE_DIR`, `VERIFY_RUN_ID`, `VERIFY_GIT_HEAD`, and `VERIFY_LAUNCH_MODE`. Add a feature by adding a function there and a file under `features/`.

## Isolation and known traps

- **One instance per checkout.** The Puma pidfile, `public/packs`, `ssr-generated`, and `.node-renderer-bundles` are shared by every `bin/dev` started in a directory. Run a second instance from another `git worktree`, which also gets its own port block.
- **Bare `bin/dev` fails** with `KeyError: RENDERER_PASSWORD is required unless ALLOW_DEMO_RENDERER_PASSWORD=true in development/test` during "Generating React on Rails packs". `bin/dev` sets that variable after `require "bundler/setup"`, and the pack generator's `Bundler.with_unbundled_env` drops it. Launch exports it beforehand; keep doing so until `bin/dev` is fixed.
- **Env files block launch.** The README suggests per-worktree ports in `.env`; this skill picks its own ports instead, so keep `.env` out of the checkout you verify from, or use a fresh worktree.
- **Port 3000 is often someone else's dev server.** Launch never uses it, and Doctor proves which process and database you are talking to.
- `/slow` deliberately blocks a Puma thread for `delay_ms` (clamped to 0–10,000), and returns 404 outside development and test. Delays above 5 s exceed the Pro renderer's default `ssr_timeout`, and the panel never renders; `drive slow` reports that as a failure (see [slow-page.md](features/slow-page.md)).

Keep the map honest as the app changes with pstack's `maintain-verification-skill` ([cursor/plugins](https://github.com/cursor/plugins), installed as `/pstack-maintain-verification-skill`). When a route, handle, or seed changes, update the matching feature file in the same PR.
