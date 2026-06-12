# React on Rails Flagship Demo (OSS)

[![SSR Smoke](https://github.com/shakacode/react-on-rails-demo-flagship/actions/workflows/smoke.yml/badge.svg)](https://github.com/shakacode/react-on-rails-demo-flagship/actions/workflows/smoke.yml)

The clone-and-run flagship demo for **open-source [React on Rails](https://github.com/shakacode/react_on_rails)** —
no Pro, no React Server Components, nothing to license. A real
ActiveRecord-backed CRUD task board, **server-rendered by Rails** and hydrated
by **React 19 + Redux Toolkit**, bundled with **Shakapacker + Rspack** in
**TypeScript**.

This is the thing Next.js structurally can't show you: a React tree dropped
into a real Rails view with `react_component(..., prerender: true)`,
server-owned data via props, ActiveRecord CRUD, one app, one deploy.

## The stack (pinned)

| Layer | Version |
| --- | --- |
| Ruby | 3.4.6 |
| Rails | 8.1.3 |
| react_on_rails (gem + npm) | 16.6.0 |
| Shakapacker | 10.1.0 (Rspack bundler) |
| React / ReactDOM | 19.0.7 (the 19.0.x line, intentionally — see below) |
| Redux Toolkit | 2.12.0 |
| TypeScript | 6.0.3 |
| Node | 22.x (22.12.0 in the container) |
| Database | SQLite |

> **Why React 19.0.x?** This demo tracks the React minor that React on Rails
> pins across its ecosystem. Don't bump React to 19.1+ here without checking
> the upstream pin first.

## Run it: clone and run

Prerequisites: Ruby 3.4.6, Node 22+, npm, SQLite (all standard Rails dev
tooling — no Redis, no Postgres, no API keys).

```bash
git clone https://github.com/shakacode/react-on-rails-demo-flagship.git
cd react-on-rails-demo-flagship
bundle install
npm install
bin/rails db:prepare db:seed
bin/dev
```

Open <http://localhost:3000>. You should see the **Flagship Task Board** with
six seeded tasks across To do / Doing / Done columns.

`bin/dev` variants: `bin/dev` (HMR), `bin/dev static` (no HMR),
`bin/dev prod` (production-like assets), `bin/dev help`.

### Success signals (machine-checkable)

The board is in the **server-rendered HTML**, not injected by the client:

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
rendered component markup — so it fails when SSR fails, even if the page
itself returns 200.

## Run it: deterministic container boot

For throwaway environments, agent evals, and CI — one command, no local Ruby
or Node needed:

```bash
docker compose up --build -d
bin/smoke      # exits 0 only if SSR HTML is being served
docker compose down
```

Everything is pinned (Ruby and Node in the Dockerfile, gems in
`Gemfile.lock`, npm packages in `package-lock.json`), assets are precompiled
at image build time, and the SQLite database is created and seeded at boot —
so the container boots deterministically with no network access after the
image build.

## What to look at

| Concern | File |
| --- | --- |
| Server-rendered React in a Rails view | `app/views/tasks/index.html.erb` (`react_component("TasksApp", props:, prerender: true)`) |
| Props built from ActiveRecord | `app/controllers/tasks_controller.rb`, `app/models/task.rb` |
| JSON CRUD endpoints | `app/controllers/api/tasks_controller.rb` |
| Redux Toolkit slice + async thunks (CSRF included) | `app/javascript/src/TasksApp/store/tasksSlice.ts` |
| Store seeded from SSR props (hydration matches) | `app/javascript/src/TasksApp/store/tasksStore.ts` |
| Auto-registered SSR/client component pair | `app/javascript/src/TasksApp/ror_components/` |
| Visible error states | `app/javascript/src/TasksApp/components/ErrorBanner.tsx` (try submitting an empty title) |
| Deterministic seeds | `db/seeds.rb` |
| SSR smoke check | `bin/smoke` |
| CI (PR + push + weekly cron) | `.github/workflows/smoke.yml` |

## How SSR works here

1. `TasksController#index` loads tasks via ActiveRecord and builds a props
   hash.
2. `react_component("TasksApp", props: @tasks_props, prerender: true)` runs
   the server bundle (built by Rspack into the private `ssr-generated/`
   directory) and embeds the rendered HTML in the response.
3. The same props are serialized to the page; on load, React 19 hydrates the
   markup and a Redux Toolkit store is created from those props, so the
   client picks up exactly where the server left off.
4. Mutations dispatch async thunks that call the JSON API with Rails CSRF
   headers (`ReactOnRails.authenticityHeaders()`); validation and network
   failures surface in a visible error banner.

Components are auto-registered: anything under
`app/javascript/src/*/ror_components/` gets its own pack generated by
`react_on_rails:generate_packs` (wired in via Shakapacker's
`precompile_hook`), and the layout's bare `javascript_pack_tag` /
`stylesheet_pack_tag` pick up the right bundles per page.

## Error states on purpose

- Submit the form with an empty title → Rails validation errors render in
  the banner (HTTP 422 from the API).
- Stop the Rails server and try any change → the network failure path shows
  "is the Rails server still running?" instead of failing silently.
- `DELETE /api/tasks/999` → JSON 404, surfaced the same way.

## Related

- [React on Rails docs](https://reactonrails.com)
- [Examples and migration references](https://reactonrails.com/docs/getting-started/examples-and-references/)
  — the full demo gallery, including the Pro + RSC demos this OSS demo is the
  baseline for.
- `npx create-react-on-rails-app` — scaffold a fresh empty app with the same
  conventions (this repo is the *finished example* counterpart).

## License

MIT
