# Create a task

A user types a title and optional notes into the form above the board and chooses Add task. The new task appears in To do and survives a reload. Submitting an empty title shows the server's validation message in the error banner.

## Sub-features

- `create-invalid` shows `Title can't be blank` in `error-banner` after an empty submit, which the API answers with 422.
- `create-save` sends `POST /api/tasks` with `X-CSRF-Token`, gets 201, and shows the card in `column-todo`.
- `create-persist` keeps the card after a full reload, and `GET /api/tasks` returns it with status `todo`.

## How to get to it (user POV)

- On `/`, fill `Task title` (and optionally `Task notes`) in `new-task-form` and choose `Add task`, or press Enter in a field.

## Driving it with verify-flagship

Preconditions:

- Baseline from [the index](./README.md), in either launch mode.
- No task titled `Verify create <RUN_ID>` exists, which is always true after a reseed.

- **Empty submit.** Choose `Add task` with both fields empty. Run `verify-flagship drive create`. `error-banner` contains `Title can't be blank`, and `empty-title-error.png` shows it.
- **Expected console error.** The browser logs the 422 from that submit. The drive asserts exactly one such error, then dismisses the banner with `Dismiss`.
- **Save.** Fill `Task title` with `Verify create <RUN_ID>` and `Task notes` with `Created by verify-flagship`, then choose `Add task`. `network.json` records `POST /api/tasks` with status 201 and `csrfHeaderSent: true`, and the card appears inside `column-todo`.
- **Persist.** Reload the page. The card is still on the board, and `GET /api/tasks` returns it with `"status": "todo"`.
- **Proof.** `before.png`, `after-create.png`, and `after-reload.png` with matching `.aria.txt` files, plus `result.json` with `"passed": true`. The reseed after the drive removes the task; the artifacts stay.

## Gotchas

- New tasks always start in To do; there is no status field on the form.
- The form trims the title and notes, so assert the rendered heading, not the input value.
- The button reads `Saving…` and is disabled while a request is in flight. Wait for the POST response, not the label.
- A validation 422 and a missing-CSRF 422 look alike in the console. The banner text tells them apart: the latter reads `Invalid or missing CSRF token`.
