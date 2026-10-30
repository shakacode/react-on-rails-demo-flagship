# Flagship demo verification map

This directory is the maintained source for verifying what a user sees in the flagship demo. Read this index before driving, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `.cursor/skills/verify-flagship/scripts/verify-flagship launch`, using `--mode static` for `slow`. Never drive port 3000 or any instance this run did not start.
- `verify-flagship doctor` ends with `doctor: healthy`.
- The run DB holds the six seeded tasks from `db/seeds.rb`: two each in `column-todo`, `column-doing`, and `column-done`. `drive` reseeds after every feature, so each recipe starts here.

## Driving conventions

- Every recipe runs through `verify-flagship drive <feature>`, which drives headless Chromium with the repo's `@playwright/test`.
- Locate elements by `data-testid`, ARIA label, or role and accessible name. A card is the `task-card` whose `<h3>` heading is the task title.
- Mutations go through the form, the status select, and the Delete button. `GET /api/tasks` is the read-only second view of stored state.
- Wait on responses and elements, not fixed sleeps.

## Proof and skip reporting

- Each feature writes screenshots, ARIA snapshots, `network.json`, and `result.json` to `tmp/verify-flagship/evidence/<RUN_ID>/<feature>/`.
- A pass needs the user action, the resulting UI state, the API response, the state after reload, and no unexpected console errors.
- Report a journey whose precondition is missing as a failure with the reason, for example `slow` under HMR mode. Never weaken the check to make it pass.
- Report each feature by its ID and the entry point driven. Do not count one entry point as proof of another.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify-flagship`, and `Gotchas`.

## Features

- [View the task board](./task-board.md) covers the streamed RSC board, columns, hydration, and the server-render stamp.
- [Create a task](./create-task.md) covers empty-title validation, creating through the form, and persistence.
- [Update or move a task](./update-task.md) covers changing status with the card's select, the column move, and persistence.
- [Delete a task](./delete-task.md) covers the card's Delete button, persistence, and the JSON 404 for a missing task.
- [Slow streaming page](./slow-page.md) covers the streamed shell, the late Suspense panel, styling without client JS, and delay parsing.
