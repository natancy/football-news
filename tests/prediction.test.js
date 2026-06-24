import assert from "node:assert/strict";
import {
  PREDICTION_MODEL,
  formatPredictionLine,
  predictMatch,
  predictMatches
} from "../src/prediction.js";

const match = {
  id: "prediction-test-1",
  date: "2026-06-26T12:00:00Z",
  group: "Group A",
  venue: "Neutral Stadium",
  city: "Neutral City",
  awayTeam: {
    name: "Uzbekistan",
    form: "LDDLL",
    record: "0-2-1"
  },
  homeTeam: {
    name: "Portugal",
    form: "WWDWW",
    record: "2-0-1"
  }
};

const prediction = predictMatch(match);

assert.equal(PREDICTION_MODEL.label, "Elo-Poisson v2");
assert.equal(prediction.matchId, match.id);
assert.equal(prediction.model, PREDICTION_MODEL.label);
assert.equal(prediction.homeTeam.name, "Portugal");
assert.equal(prediction.awayTeam.name, "Uzbekistan");
assert.ok(prediction.confidence >= 0 && prediction.confidence <= 100);
assert.ok(
  prediction.exactScoreConfidence >= 0 && prediction.exactScoreConfidence <= 100
);
assert.ok(prediction.homeGoals >= 0 && prediction.homeGoals <= 5);
assert.ok(prediction.awayGoals >= 0 && prediction.awayGoals <= 5);
assert.equal(
  prediction.probabilities.homeWin +
    prediction.probabilities.draw +
    prediction.probabilities.awayWin,
  100
);
assert.equal(prediction.outcome, "home");
assert.ok(prediction.probabilities.homeWin > prediction.probabilities.awayWin);
assert.ok(prediction.expectedGoals.home > prediction.expectedGoals.away);
assert.match(formatPredictionLine(prediction), /Uzbekistan/);
assert.equal(predictMatches([match]).length, 1);
