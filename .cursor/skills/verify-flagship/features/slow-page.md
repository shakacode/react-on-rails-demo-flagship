# Slow streaming page

`/slow?delay_ms=N` streams a header right away, then a stats panel whose Suspense boundary resolves after a deliberate N ms server delay. The late panel must arrive as styled HTML even when the client bundles never load, which makes this page the late-boundary FOUC regression bed.

## Sub-features

- `slow-shell` sends the header (`Slow Section (Late Suspense Boundary)`) before the delayed panel.
- `slow-panel` renders `[data-slow-stats-panel]` with heading `Stats loaded after <N>ms`.
- `slow-no-fouc` gives the panel its CSS-module background `rgb(26, 26, 46)` on its first visible frame, with every script request aborted.
- `slow-delay-parse` falls back to 1500 ms for a malformed `delay_ms` and clamps values to 0–10,000.

## How to get to it (user POV)

- Open `/slow` or `/slow?delay_ms=3000` in development. Nothing on the board links to it.

## Driving it with verify-flagship

Preconditions:

- Launched with `verify-flagship launch --mode static`. Under HMR the no-JS check fails by design, and the drive says so in its detail.
- `doctor` is healthy.

- **Streamed shell.** Fetch `/slow?delay_ms=1500` with streaming reads. Run `verify-flagship drive slow`. `result.json` records `headerAtMs` well before `panelAtMs`, at least 80% of the delay apart.
- **No-JS panel.** Load the same URL in Chromium with every script request aborted. The panel shows `Stats loaded after 1500ms`, and `blockedScripts` is greater than 0.
- **No FOUC.** An init script samples the panel's computed `background-color` on the first animation frame where it is visible. Both that first-frame value and the settled value are `rgb(26, 26, 46)`, as `no-js.png` shows.
- **Malformed delay.** Load `/slow?delay_ms=not-a-number` with JavaScript enabled. The panel reads `Stats loaded after 1500ms`.
- **Clamping.** Load `/slow?delay_ms=-5` and `/slow?delay_ms=20000`. The panels read `Stats loaded after 0ms` and `Stats loaded after 10000ms`; the second takes ten seconds.
- **Proof.** `streamed.html`, `no-js.png`, `no-js.aria.txt`, `with-js.png`, `with-js.aria.txt`, and `result.json`. As of this map's last update, every check passes except `delay_ms=20000`; see the known failure under Gotchas.

## Gotchas

- **Known failure:** delays above the Pro renderer's `ssr_timeout` (5 s by default) never render the panel. Rails hits `ReactOnRailsPro::RendererHttpClient::TimeoutError: read timeout` after 5 s. The page then keeps its `Loading stats` fallback behind a 200, or returns 500, so `delay_ms=20000` fails its clamp check even though the README promises 10,000 ms. The journey keeps asserting the documented contract; this needs an app or config fix, not a weaker check.
- The delay blocks a Puma thread. Keep `delay_ms` small and never fire parallel requests at a shared instance.
- `/slow` returns 404 in production, including hosted review apps; this journey is local only.
- Aborting script requests stops the external bundles only. Inline scripts, such as the streamed RSC payload, still run, so this proves the CSS arrives with the streamed HTML rather than from the client bundles.
- Blocked scripts log `net::ERR_FAILED` console errors. The drive drops only those, and only from the blocked-scripts pass.
- Under HMR mode (`bin/dev`), CSS arrives through JavaScript, so `slow-no-fouc` reads `rgba(0, 0, 0, 0)`. That reflects the launch mode, not a regression.
