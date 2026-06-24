# Retrospective

## AI Tools Used

- Codex for repository inspection, implementation, documentation and test creation.
- Web/API lookup to verify a no-key data source for World Cup fixtures.

## Development Workflow

1. Read `AI-Native Engineering Challenge.md`.
2. Confirmed the repository was empty except for the challenge document and IDE metadata.
3. Chose a small static web app so the project can run locally and be deployed easily.
4. Verified the ESPN FIFA World Cup scoreboard endpoint returns 2026 matchday data.
5. Implemented the UI, API normalization, timezone filtering, caching and fallback behavior.
6. Added a local next-matchday prediction model.
7. Added unit tests and challenge-required documentation.

## What Worked Well

- The challenge format helped define the expected deliverables early.
- Keeping the app dependency-free made setup and review simple.
- Separating data normalization from UI rendering made the logic testable.
- Moving predictions to a local Elo-Poisson model kept the feature explainable without adding an API key or opaque external model.

## What Did Not Work Well

- The challenge document is game-oriented, while the chosen idea is a notification utility. The project therefore documents the scope deviation clearly.
- Public sports APIs can change without notice, so fallback data and source badges are necessary.
- Sports predictions are inherently uncertain, so the UI needs restrained wording, expected-goal context and clear confidence signals.

## Surprises and Discoveries

- ESPN's public scoreboard payload contains useful match metadata, but also betting and ticket fields that should not be surfaced for this product.
- Querying only one API date is not enough for timezone-aware "today" filtering.
- A deterministic Poisson score matrix is easier to test and explain than random-looking score generation.

## Estimated AI-Generated Code

Approximately 90% of the initial implementation and documentation was generated with AI assistance, with human direction coming from the product idea and challenge constraints.

## Time Spent

About 1 to 2 hours for the first complete version.

## What I Would Do Differently Next Time

- Add a small service worker so the page can work better offline.
- Add a server-side scheduled job if closed-browser push notifications become a real requirement.
- Add visual regression tests for the responsive layout.

## Key Lessons Learned

- AI-native work benefits from turning the challenge document into concrete deliverables before writing code.
- A narrow scope with explicit acceptance criteria makes AI-generated implementation easier to validate.
- Current-data products should treat upstream APIs as unreliable and display data freshness clearly.
