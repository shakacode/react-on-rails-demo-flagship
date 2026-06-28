# React on Rails Pro Flagship Demo

[![RSC Smoke](https://github.com/shakacode/react-on-rails-demo-flagship/actions/workflows/smoke.yml/badge.svg)](https://github.com/shakacode/react-on-rails-demo-flagship/actions/workflows/smoke.yml)

The clone-and-run flagship demo for **[React on Rails Pro](https://reactonrails.com/pro)**:
React Server Components, streaming SSR, the Pro Node renderer, React 19,
Redux Toolkit, Shakapacker, Rspack, TypeScript, and a real Rails CRUD app.

This repo intentionally shows the Pro/RSC happy path as the default. React on
Rails Pro has a friendly license: it is free for evaluation and non-production
use, and free or low-cost production licenses are available for startups and
small companies. You can clone this demo, run it locally, and inspect the Pro
RSC architecture before deciding what license you need for production.

This is the thing Next.js structurally cannot show you: a React Server Component
streamed through a real Rails view, server-owned data from ActiveRecord, Rails
JSON mutations, one app, one deploy.

## The stack (pinned)

| Layer | Version |
| --- | --- |
| Ruby | 3.4.6 |
| Rails | 8.1.3 |
| react_on_rails_pro (gem + npm) | 16.6.0 |
| react-on-rails-rsc | 19.0.5 |
| Pro Node renderer | 16.6.0 |
| Shakapacker | 10.1.0 (Rspack bundler) |
| React / ReactDOM | 19.0.7 (the 19.0.x line, intentionally - see below) |
| Redux Toolkit | 2.12.0 |
| TypeScript | 6.0.3 |
| Node | 22.x (22.12.0 in the container) |
| Database | SQLite |

> **Why React 19.0.x?** The stable `react-on-rails-rsc` package tracks the
> React 19.0 line. Do not bump React to 19.1+ here without checking the
> matching `react-on-rails-rsc` release and the upstream Pro/RSC pins first.

## Run it: clone and run

Prerequisites: Ruby 3.4.6, Node 22+, npm, SQLite (all standard Rails dev
tooling - no Redis, no Postgres, no API keys).

```bash
git clone https://github.com/shakacode/react-on-rails-demo-flagship.git
cd react-on-rails-demo-flagship
bundle install
npm install
ALLOW_DEMO_RENDERER_PASSWORD=true bin/rails db:prepare db:seed
bin/dev
```

Open <http://localhost:3000>. You should see the **Flagship Task Board** with
six seeded tasks across To do / Doing / Done columns.

`bin/dev` variants: `bin/dev` (HMR), `bin/dev static` (no HMR),
`bin/dev prod` (production-like assets), `bin/dev help`.

To run multiple worktrees at the same time, set unique port values in each worktree's
`.env` file:

```bash
PORT=3001
SHAKAPACKER_DEV_SERVER_PORT=3036
RENDERER_PORT=3801
RENDERER_URL=http://localhost:3801
```

In local development `bin/dev` opts into the shared `development_password`
between Rails and the Node renderer. If you run Rails manually without setting
`RENDERER_PASSWORD`, also set `ALLOW_DEMO_RENDERER_PASSWORD=true`. Production-like
deployments must provide a secret `RENDERER_PASSWORD`; the app intentionally
fails closed without that value. Set `RENDERER_URL` to the renderer workload and
bind the renderer with `RENDERER_HOST=0.0.0.0` when Rails reaches it over a
container network.

`bin/ci` also fails closed by default. Run it with `RENDERER_PASSWORD=...` for a
production-like check, or use `ALLOW_DEMO_RENDERER_PASSWORD=true bin/ci` for a
disposable local/demo check.

If you run with `RAILS_ENV=production` and no Pro license token, Pro will warn
about the missing production license. That is expected for demo/evaluation use.
Use a production license token before using this architecture in production.

### Success signals (machine-checkable)

The board is in the **streamed HTML**, not injected by the client:

```bash
curl -s localhost:3000 | grep -c 'data-testid="task-card"'
# => 6  (one per seeded task, in the raw HTML response)

curl -s localhost:3000 | grep -o 'Render the first screen on the server</h3>'
# => Render the first screen on the server</h3>  (real component markup, not props JSON)
```

Or run the bundled check against any running instance:

```bash
bin/smoke                                   # defaults to http://localhost:3000
SMOKE_URL=http://localhost:3000 bin/smoke   # explicit
```

`bin/smoke` exits **non-zero** unless the seeded task title appears inside
rendered component markup - so it fails when Pro/RSC rendering fails, even if the page
itself returns 200.

## Run it: deterministic container boot

For throwaway environments, agent evals, and CI - one command, no local Ruby
or Node needed:

```bash
docker compose up --build -d
bin/smoke      # exits 0 only if streamed RSC HTML is being served
docker compose down
```

Everything is pinned (Ruby and Node in the Dockerfile, gems in `Gemfile.lock`,
npm packages in `package-lock.json`), assets are precompiled at image build
time, the Node renderer runs as a sidecar service, and the SQLite database is
created and seeded at boot. The containers boot deterministically with no
network access after the image build.

## What to look at

| Concern | File |
| --- | --- |
| Streamed RSC in a Rails view | `app/views/tasks/index.html.erb` (`stream_react_component("TasksApp", props:)`) |
| Streaming controller + ActiveRecord props | `app/controllers/tasks_controller.rb`, `app/models/task.rb` |
| JSON CRUD endpoints | `app/controllers/api/tasks_controller.rb` |
| Redux Toolkit slice + async thunks (CSRF included) | `app/javascript/src/TasksApp/store/tasksSlice.ts` |
| Store seeded from streamed props (hydration matches) | `app/javascript/src/TasksApp/store/tasksStore.ts` |
| Auto-registered RSC/client component pair | `app/javascript/src/TasksApp/ror_components/` |
| Pro Node renderer entrypoint | `client/node-renderer.js` |
| RSC bundle config | `config/rspack/rscWebpackConfig.js` |
| Visible error states | `app/javascript/src/TasksApp/components/ErrorBanner.tsx` (try submitting an empty title) |
| Deterministic seeds | `db/seeds.rb` |
| RSC smoke check | `bin/smoke` |
| CI (PR + push + weekly cron) | `.github/workflows/smoke.yml` |

## How Pro/RSC Works Here

1. `TasksController#index` loads tasks via ActiveRecord and builds a props
   hash.
2. `stream_view_containing_react_components` renders the Rails view and
   `stream_react_component("TasksApp", props: @tasks_props)` asks the Pro Node
   renderer to stream the React Server Component.
3. Rspack builds three outputs: the browser bundle, the private server bundle,
   and the private `rsc-bundle.js`. The Pro renderer receives the server/RSC
   bundles and streams HTML back to Rails.
4. The same props are serialized to the page; on load, React 19 hydrates the
   client component and a Redux Toolkit store is created from those props, so
   the client picks up exactly where the server left off.
5. Mutations dispatch async thunks that call the JSON API with Rails CSRF
   headers (`ReactOnRails.authenticityHeaders()`); validation and network
   failures surface in a visible error banner.

Components are auto-registered: anything under
`app/javascript/src/*/ror_components/` gets its own pack generated by
`react_on_rails:generate_packs` (wired in via Shakapacker's `precompile_hook`).
The `'use client'` directive in `TasksApp.client.tsx` marks the hydrated client
component; `TasksApp.server.tsx` remains the server component entrypoint.

## Error states on purpose

- Submit the form with an empty title -> Rails validation errors render in
  the banner (HTTP 422 from the API).
- Stop the Rails server and try any change -> the network failure path shows
  "is the Rails server still running?" instead of failing silently.
- `DELETE /api/tasks/999` -> JSON 404, surfaced the same way.

## Related

- [React on Rails docs](https://reactonrails.com)
- [React on Rails Pro](https://reactonrails.com/pro)
- [RSC tutorial](https://reactonrails.com/docs/pro/react-server-components/tutorial)
- [Examples and migration references](https://reactonrails.com/docs/getting-started/examples-and-references/)
- [Using TanStack Query](https://reactonrails.com/docs/building-features/tanstack-query) - the recommended client-side server-state layer; prefer it over hand-syncing server data into a Redux store. See the [TanStack starter](https://starter.reactonrails.com).
  - the full demo gallery.
- `npx create-react-on-rails-app` - scaffold a fresh empty app with the same
  conventions (this repo is the finished Pro/RSC example counterpart).

## Turning Pro/RSC Off

This repo defaults to Pro + RSC because that is the flagship path. If you want a
comparison app without Pro:

1. Replace `react_on_rails_pro` with `react_on_rails` in the Gemfile and run
   `bundle install`.
2. Replace `react-on-rails-pro` with `react-on-rails` in `package.json`, remove
   `react-on-rails-pro-node-renderer` and `react-on-rails-rsc`, then run
   `npm install`.
3. Remove `config/initializers/react_on_rails_pro.rb`, `rsc_payload_route`,
   `client/node-renderer.js`, and the `RSC_BUNDLE_ONLY` process.
4. Change the view from `stream_react_component` back to
   `react_component(..., prerender: true)` and remove the streaming call from
   `TasksController#index`.
5. Remove the RSC bundle config and Pro Node renderer deployment workload.

That comparison path is intentionally documented here rather than maintained as
the default app, because the flagship exists to show the Pro/RSC architecture.

## License

MIT
