# View the task board

Opening the site shows the Flagship Task Board: six seeded tasks in To do, Doing, and Done columns. Rails and the Pro Node renderer stream it as HTML, and React then hydrates it without errors.

## Sub-features

- `board-streamed` puts all six cards and their titles in the raw HTML before any JavaScript runs.
- `board-columns` groups cards into `column-todo`, `column-doing`, and `column-done`, two seeded cards each.
- `board-hydrated` keeps the same six cards after hydration, with no console or page errors.
- `board-ssr-stamp` shows the server render time in `ssr-timestamp`.

## How to get to it (user POV)

- Open `/` in a browser.
- View the page source, or `curl` `/`, to see the streamed markup.

## Driving it with verify-flagship

Preconditions:

- Baseline from [the index](./README.md), in either launch mode.

- **Streamed HTML.** Fetch `/` without a browser. Run `verify-flagship drive board`. `streamed.html` contains six `data-testid="task-card"` and `Render the first screen on the server</h3>`.
- **Hydrated board.** The same drive opens `/` and waits for network idle. `tasks-app` is visible with six `task-card` elements.
- **Columns.** The drive counts cards per column. `column-todo`, `column-doing`, and `column-done` each report 2.
- **Server stamp.** The drive reads `ssr-timestamp`. It holds an ISO 8601 time.
- **Proof.** `board.png` and `board.aria.txt` show the three column headings with counts, and `result.json` has `"passed": true`.

## Gotchas

- `/up` returns 200 before the renderer can serve the board. Trust `bin/smoke` and the drive, not the health check.
- The card count is exact. Leftover rows from an unreseeded drive or a manual edit fail `board-columns`; run `verify-flagship reseed`.
- The serialized props JSON also contains the task titles, so a title match outside `</h3>` proves nothing about server rendering.
