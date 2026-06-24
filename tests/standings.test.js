import assert from "node:assert/strict";
import {
  describeQualification,
  getTeamStanding,
  inferStandingsForMatches,
  normalizeStandings
} from "../src/standings.js";

const standings = normalizeStandings({
  children: [
    {
      name: "Group A",
      standings: {
        entries: [
          {
            team: {
              displayName: "Mexico",
              abbreviation: "MEX"
            },
            note: {
              description: "Advance to Round of 32"
            },
            stats: [
              { name: "gamesPlayed", displayValue: "2" },
              { name: "wins", displayValue: "2" },
              { name: "ties", displayValue: "0" },
              { name: "losses", displayValue: "0" },
              { name: "points", displayValue: "6" },
              { name: "pointsFor", displayValue: "3" },
              { name: "pointsAgainst", displayValue: "0" },
              { name: "pointDifferential", displayValue: "+3" }
            ]
          },
          {
            team: {
              displayName: "South Africa",
              abbreviation: "RSA"
            },
            note: {
              description: "Eliminated"
            },
            stats: [
              { name: "gamesPlayed", displayValue: "2" },
              { name: "wins", displayValue: "0" },
              { name: "ties", displayValue: "1" },
              { name: "losses", displayValue: "1" },
              { name: "points", displayValue: "1" },
              { name: "pointDifferential", displayValue: "-2" }
            ]
          }
        ]
      }
    }
  ]
});

assert.equal(standings.groups.length, 1);
assert.equal(standings.teams.Mexico.points, 6);
assert.equal(standings.teams.MEX.qualificationStatus, "direct");
assert.equal(standings.teams["South Africa"].qualificationStatus, "eliminated");
assert.equal(
  describeQualification(standings.teams.Mexico),
  "当前直接出线区"
);

const matchStandings = inferStandingsForMatches([
  {
    group: "Group B",
    awayTeam: {
      name: "Canada",
      abbreviation: "CAN",
      record: "1-0-1"
    },
    homeTeam: {
      name: "Qatar",
      abbreviation: "QAT",
      record: "0-1-1"
    }
  }
]);

assert.equal(
  getTeamStanding(matchStandings, { name: "Canada", abbreviation: "CAN" }).points,
  4
);
assert.equal(
  getTeamStanding(matchStandings, { name: "Qatar", abbreviation: "QAT" })
    .qualificationStatus,
  "wildcard"
);
