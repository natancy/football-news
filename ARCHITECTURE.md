# Architecture

## Technology Stack

- HTML, CSS and browser JavaScript.
- ES modules.
- No build step and no runtime dependencies.
- Node.js is used only for unit tests.
- Python 3 `http.server` is used for local serving.

## Application Structure

```text
index.html              App shell and templates
styles.css              Responsive visual design
src/app.js              UI state, events, rendering and notifications
src/date.js             Timezone-safe date formatting helpers
src/schedule.js         ESPN fetch, normalization, filtering and message creation
src/prediction.js       Local Elo-Poisson model for next-matchday score prediction
src/fallback.js         Offline fallback match data
tests/schedule.test.js  Unit tests for core logic
tests/prediction.test.js Unit tests for prediction logic
```

## Data Flow

1. `app.js` determines the selected date and timezone.
2. `schedule.js` requests ESPN scoreboard data for the selected date, previous date and next date.
3. ESPN events are normalized into a stable internal match model.
4. Matches are filtered by the selected timezone's local date.
5. `app.js` renders match cards and the notification message.
6. `app.js` asks `schedule.js` for the next matchday after the selected date.
7. `prediction.js` creates score and result predictions for that next matchday using static rating baselines, recent form adjustments, venue adjustments and a Poisson score matrix.
8. Successful API results are cached in `localStorage` for six hours.
9. If the API fails, fallback data is filtered with the same logic.

## Major Decisions

- A static frontend keeps the project deployable from GitLab/GitDocs or any static host.
- Fetching adjacent ESPN dates avoids missing games that cross UTC or host-country date boundaries.
- The UI deliberately excludes odds and ticket data even when present in the API payload.
- Browser notifications are user-triggered because reliable background push would require service workers and a server-side push subscription flow.
- Predictions are deterministic and local so the same input produces stable UI and testable output.
- Prediction labels are intentionally framed as reference output, not as official forecasts or betting advice.
- The prediction model avoids random jitter. The most likely score is selected from an enumerated Poisson score matrix.
- The rating table is static and intentionally transparent; it should be replaced or periodically regenerated if production accuracy becomes important.

## AI Tooling Used

- Codex was used for requirement extraction, implementation, test creation and documentation.
- Shell commands were used to inspect the repository and validate the ESPN API response.
- Browser verification was used after implementation to check the local UI.
