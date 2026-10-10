# Habitat request-body budget (SEC-02)

This isolated change hardens the existing Habitat JSON reader without changing
session policy, world ownership, storage, key economics, or the API payload schema.

## Previously

`await request.text()` read the entire body into memory before checking its
length. A large request with an absent/misleading `Content-Length` could be
buffered fully before the API returned HTTP 413.

## New behavior

`readHabitatJson` checks a sane `Content-Length` before touching the stream,
then consumes the `Request.body` as UTF-8 chunks with a fixed budget of **80,000
raw bytes**. Multibyte text counts toward the budget by byte size. Requests
without `Content-Length` are still bounded. Oversize reads stop with HTTP
413 `INPUT_TOO_LARGE` and cancel the remaining stream; malformed JSON still
maps to the existing 422 `INVALID_INPUT` response.

This changes the previous limit from 80,000 JavaScript characters to 80,000
raw UTF-8 bytes, a stricter and predictable resource cap. No arbitrary
upload or remote content fetch has been added.

## Tests

`tests/unit/habitat-body-budget.test.ts` checks exact-boundary success,
header preflight without consuming the request, over-limit multi-chunk streams,
multibyte input, malformed JSON and integration through the existing signed
wallet profile API. Legacy unit/API tests and Next production build are also
part of the workflow.

Integrate via PR against `work/integration`; do not merge or deploy automatically.
The larger wallet guest-boundary fix is tracked separately by PR #8, so this
patch does not widen the behavioral scope of either security change.
