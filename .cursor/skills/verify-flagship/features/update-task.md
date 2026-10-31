# Update or move a task

Each card has a status select labelled `Status for <title>`. Choosing a new status moves the card to that column, saves through the JSON API, and survives a reload.

## Sub-features

- `move-status` sends `PATCH /api/tasks/:id` with `X-CSRF-Token` and gets 200.
- `move-column` takes the card out of its old column and puts it in the new one.
- `move-persist` keeps the status after a full reload, and `GET /api/tasks` returns it.

## How to get to it (user POV)

- On `/`, open the status select on a card and choose To do, Doing, or Done.

## Driving it with verify-flagship

Preconditions:

- Baseline from [the index](./README.md), in either launch mode.
- The seeded task `Break something on purpose` is in To do.

- **Start state.** Read the select `Status for Break something on purpose`. Run `verify-flagship drive update`. It reads `todo`, and `before.png` shows the card under To do.
- **Move.** Choose `doing` in that select. `network.json` records `PATCH /api/tasks/5` with status 200 and `csrfHeaderSent: true`. The card is inside `column-doing` and gone from `column-todo`.
- **Persist.** Reload the page. The select still reads `doing`, and `GET /api/tasks` returns `"status": "doing"` for that title.
- **Proof.** `before.png`, `after-move.png`, and `after-reload.png` with matching `.aria.txt` files, plus `result.json` with `"passed": true`. The reseed afterwards puts the task back in To do.

## Gotchas

- There is no drag and drop, despite the seeded title `Drag a task to Done`. Moving a task means changing the select.
- The UI updates only after the PATCH succeeds. A failed PATCH shows `error-banner` and leaves the card where it was, so check the column after the response, not before.
- Cards sort by `position` within a column, so a moved card can land above existing cards.
