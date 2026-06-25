# Specification

## Product

World Cup Forecast Board is a lightweight browser page that prioritizes next-matchday predictions and keeps the daily FIFA World Cup matchday notification concise.

## Scope

In scope:

- Fetch FIFA World Cup fixtures for a selected date.
- Filter fixtures by the selected local timezone.
- Display compact match result rows with teams, kickoff time, venue, group and current status or score.
- Generate a concise Chinese notification message.
- Allow copying the message.
- Allow sending the message through the browser Notification API.
- Find the next matchday after the selected date and predict outcomes.
- Present prediction output as the primary page content.
- Refresh automatically when the local date changes while the page is open.
- Provide fallback data if the live API fails.

Out of scope:

- User accounts.
- Push notifications when the browser tab is closed.
- Betting odds, ticket purchase flows or paid content.
- Official predictions or gambling advice.
- Historical analytics beyond the current table.

## Functional Requirements

1. On load, the app must select today's date in the configured timezone.
2. The app must fetch live scoreboard data from ESPN when possible.
3. The app must query adjacent API dates and filter by local timezone.
4. The app must show an empty state when there are no matches.
5. The app must generate a message that includes the display date, match count and first kickoff time.
6. The app must cache successful results for six hours.
7. The app must avoid showing gambling odds or ticket pricing from the upstream payload.
8. The app must predict the next matchday using local deterministic logic.
9. Predictions must include predicted score, likely result, expected goals, score confidence and win/draw/loss probabilities.
10. Predictions must include qualification context when standings data is available.
11. Prediction UI must identify that predictions are reference output, not official forecasts or betting advice.
12. The README must include a public hosted demo link for automated challenge monitor checks.

## Acceptance Criteria

- Opening `http://localhost:5173` shows a complete notification page.
- For a date with matches, the page lists all matches in chronological order.
- Changing date or timezone refreshes the visible matches.
- The copy button writes the generated message to the clipboard.
- The browser notification button requests permission and sends the generated message when allowed.
- The prediction section shows the next matchday after the selected date when one is found.
- Prediction output is stable for the same match input.
- Prediction cards show each team's qualification situation.
- The repository includes `README.md`, `SPEC.md`, `ARCHITECTURE.md` and `RETROSPECTIVE.md`.
- The README contains a public hosted demo link that returns an HTML app page.
- `npm test` passes.
