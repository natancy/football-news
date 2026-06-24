# Specification

## Product

World Cup Matchday Notifier is a lightweight browser page that creates a daily notification message for FIFA World Cup matchdays.

## Scope

In scope:

- Fetch FIFA World Cup fixtures for a selected date.
- Filter fixtures by the selected local timezone.
- Display match cards with teams, kickoff time, venue, group and broadcast names.
- Generate a concise Chinese notification message.
- Allow copying the message.
- Allow sending the message through the browser Notification API.
- Find the next matchday after the selected date and predict outcomes.
- Refresh automatically when the local date changes while the page is open.
- Provide fallback data if the live API fails.

Out of scope:

- User accounts.
- Push notifications when the browser tab is closed.
- Betting odds, ticket purchase flows or paid content.
- Official predictions or gambling advice.
- Historical analytics and standings.

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
10. Prediction UI must identify that predictions are reference output, not official forecasts or betting advice.

## Acceptance Criteria

- Opening `http://localhost:5173` shows a complete notification page.
- For a date with matches, the page lists all matches in chronological order.
- Changing date or timezone refreshes the visible matches.
- The copy button writes the generated message to the clipboard.
- The browser notification button requests permission and sends the generated message when allowed.
- The prediction section shows the next matchday after the selected date when one is found.
- Prediction output is stable for the same match input.
- `npm test` passes.
