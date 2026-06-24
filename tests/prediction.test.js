import assert from "node:assert/strict";
import {
  formatPredictionLine,
  predictMatch,
  predictMatches
} from "../src/prediction.js";

const match = {
  id: "prediction-test-1",
  date: "2026-06-26T12:00:00Z",
  group: "Group A",
  awayTeam: {
    name: "Uzbekistan",
    form: "LDDLL"
  },
  homeTeam: {
    name: "Portugal",
    form: "WWDWW"
  }
};

const prediction = predictMatch(match);

assert.equal(prediction.matchId, match.id);
assert.equal(prediction.homeTeam.name, "Portugal");
assert.equal(prediction.awayTeam.name, "Uzbekistan");
assert.ok(prediction.confidence >= 0 && prediction.confidence <= 100);
assert.ok(prediction.homeGoals >= 0 && prediction.homeGoals <= 5);
assert.ok(prediction.awayGoals >= 0 && prediction.awayGoals <= 5);
assert.equal(
  prediction.probabilities.homeWin +
    prediction.probabilities.draw +
    prediction.probabilities.awayWin >=
    99,
  true
);
assert.match(formatPredictionLine(prediction), /Uzbekistan/);
assert.equal(predictMatches([match]).length, 1);
