import assert from "node:assert/strict";
import {
  addDaysToDateKey,
  getDateKeyInTimezone,
  toEspnDateParam
} from "../src/date.js";
import {
  createNotificationMessage,
  fetchNextMatchday,
  filterMatchesByLocalDate,
  normalizeEspnEvents
} from "../src/schedule.js";

assert.equal(toEspnDateParam("2026-06-24"), "20260624");
assert.equal(addDaysToDateKey("2026-06-24", 1), "2026-06-25");
assert.equal(
  getDateKeyInTimezone("2026-06-25T01:00:00Z", "Asia/Shanghai"),
  "2026-06-25"
);

const normalized = normalizeEspnEvents([
  {
    id: "1",
    date: "2026-06-24T19:00:00Z",
    season: { slug: "group-stage" },
    competitions: [
      {
        altGameNote: "FIFA World Cup, Group B",
        status: {
          type: {
            shortDetail: "Scheduled",
            completed: false
          }
        },
        venue: {
          fullName: "Lumen Field",
          address: {
            city: "Seattle",
            country: "USA"
          }
        },
        broadcasts: [{ names: ["FS1", "FOX One"] }],
        competitors: [
          {
            homeAway: "home",
            score: "0",
            team: {
              displayName: "Bosnia-Herzegovina",
              abbreviation: "BIH",
              logo: "bih.png"
            }
          },
          {
            homeAway: "away",
            score: "0",
            team: {
              displayName: "Qatar",
              abbreviation: "QAT",
              logo: "qat.png"
            }
          }
        ]
      }
    ],
    links: [{ rel: ["summary"], href: "https://example.com/match" }]
  }
]);

assert.equal(normalized.length, 1);
assert.equal(normalized[0].awayTeam.name, "Qatar");
assert.equal(normalized[0].homeTeam.name, "Bosnia-Herzegovina");
assert.equal(normalized[0].group, "Group B");
assert.deepEqual(normalized[0].broadcasts, ["FS1", "FOX One"]);

assert.equal(
  filterMatchesByLocalDate(normalized, "2026-06-25", "Asia/Shanghai").length,
  1
);

const message = createNotificationMessage(
  normalized,
  "2026-06-24",
  "America/New_York",
  "2026年6月24日星期三"
);

assert.match(message, /世界杯比赛日/);
assert.match(message, /Qatar vs Bosnia-Herzegovina/);

const responsesByDate = new Map([
  ["20260624", { events: [] }],
  ["20260625", { events: [] }],
  [
    "20260626",
    {
      events: [
        {
          id: "2",
          date: "2026-06-26T12:00:00Z",
          competitions: [
            {
              status: { type: { shortDetail: "Scheduled", completed: false } },
              venue: { fullName: "Test Stadium", address: { city: "Test City" } },
              competitors: [
                {
                  homeAway: "home",
                  team: { displayName: "Brazil", abbreviation: "BRA" }
                },
                {
                  homeAway: "away",
                  team: { displayName: "France", abbreviation: "FRA" }
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  ["20260627", { events: [] }]
]);

const fakeFetch = async (url) => {
  const date = new URL(url).searchParams.get("dates");
  return {
    ok: true,
    json: async () => responsesByDate.get(date) || { events: [] }
  };
};

const nextMatchday = await fetchNextMatchday(
  "2026-06-24",
  "UTC",
  fakeFetch,
  3
);

assert.equal(nextMatchday.dateKey, "2026-06-26");
assert.equal(nextMatchday.matches.length, 1);
