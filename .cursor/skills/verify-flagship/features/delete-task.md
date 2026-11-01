# Delete a task

Each card has a Delete button. Choosing it removes the task from the board and the database right away, with no confirmation dialog. Deleting a task that no longer exists answers with a JSON 404.

## Sub-features

- `delete-card` sends `DELETE /api/tasks/:id` with `X-CSRF-Token`, gets 204, and removes the card.
- `delete-persist` keeps the card gone after a full reload, and `GET /api/tasks` no longer returns it.
- `delete-missing` answers `DELETE /api/tasks/999999`, with a valid CSRF token, with 404 and `{"errors":["Task not found"]}`.

## How to get to it (user POV)

- On `/`, choose `Delete` on a card.
- The missing-task case has no button. A user reaches it with a stale tab, and the README documents it as an API error state.

## Driving it with verify-flagship

Preconditions:

- Baseline from [the index](./README.md), in either launch mode.

- **Setup.** Create a disposable task through the form, so no seeded row is the victim. Run `verify-flagship drive delete`. `POST /api/tasks` answers 201, and the card `Verify delete <RUN_ID>` appears.
- **Delete.** Choose `Delete` inside that card. `network.json` records `DELETE /api/tasks/:id` with status 204 and `csrfHeaderSent: true`, and the card detaches.
- **Persist.** Reload the page. The card is absent, `GET /api/tasks` has no task with that title, and every task ID present before the delete is still returned.
- **Missing task.** The drive reads `meta[name="csrf-token"]` and sends `DELETE /api/tasks/999999` from the page's session. It answers 404 with `{"errors":["Task not found"]}`.
- **Proof.** `before.png` and `after-delete.png` with matching `.aria.txt` files, plus `result.json` with `"passed": true`.

## Gotchas

- Delete is immediate, with no undo. Never delete a seeded task outside a disposable run DB.
- Without a CSRF token the API answers 422 `Invalid or missing CSRF token` before it looks up the task, so a 404 check needs the page's token and cookies.
- The card's Delete button has no test ID. Scope `getByRole('button', { name: 'Delete' })` to the card, or you will hit the first card's button.
