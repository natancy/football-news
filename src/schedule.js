import {
  addDaysToDateKey,
  getDateKeyInTimezone,
  toEspnDateParam
} from "./date.js";
import { FALLBACK_EVENTS } from "./fallback.js";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

export function buildEspnUrl(dateKey) {
  const url = new URL(ESPN_SCOREBOARD_URL);
  url.searchParams.set("dates", toEspnDateParam(dateKey));
  return url.toString();
}

export async function fetchMatchesForDate(dateKey, timeZone, fetcher = fetch) {
  const queryDates = [
    addDaysToDateKey(dateKey, -1),
    dateKey,
    addDaysToDateKey(dateKey, 1)
  ];

  const payloads = await Promise.all(
    queryDates.map(async (queryDate) => {
      const response = await fetcher(buildEspnUrl(queryDate));
      if (!response.ok) {
        throw new Error(`ESPN scoreboard request failed: ${response.status}`);
      }
      return response.json();
    })
  );

  return filterMatchesByLocalDate(
    normalizeEspnEvents(payloads.flatMap((payload) => payload.events || [])),
    dateKey,
    timeZone
  );
}

export async function fetchNextMatchday(
  afterDateKey,
  timeZone,
  fetcher = fetch,
  maxDays = 14
) {
  for (let offset = 1; offset <= maxDays; offset += 1) {
    const dateKey = addDaysToDateKey(afterDateKey, offset);
    const matches = await fetchMatchesForDate(dateKey, timeZone, fetcher);
    if (matches.length) {
      return { dateKey, matches };
    }
  }

  return { dateKey: "", matches: [] };
}

export function getFallbackMatchesForDate(dateKey, timeZone) {
  return filterMatchesByLocalDate(FALLBACK_EVENTS, dateKey, timeZone);
}

export function getFallbackNextMatchday(afterDateKey, timeZone, maxDays = 14) {
  for (let offset = 1; offset <= maxDays; offset += 1) {
    const dateKey = addDaysToDateKey(afterDateKey, offset);
    const matches = getFallbackMatchesForDate(dateKey, timeZone);
    if (matches.length) {
      return { dateKey, matches };
    }
  }

  return { dateKey: "", matches: [] };
}

export function normalizeEspnEvents(events) {
  const byId = new Map();

  for (const event of events) {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors || [];
    const home = competitors.find((entry) => entry.homeAway === "home");
    const away = competitors.find((entry) => entry.homeAway === "away");

    if (!event.id || !event.date || !home?.team || !away?.team) {
      continue;
    }

    byId.set(event.id, {
      id: event.id,
      date: event.date,
      status:
        competition?.status?.type?.shortDetail ||
        competition?.status?.type?.description ||
        "Scheduled",
      group: normalizeGroupLabel(competition?.altGameNote || event.season?.slug),
      venue: competition?.venue?.fullName || competition?.venue?.displayName || "",
      city: normalizeVenueCity(competition?.venue?.address),
      broadcasts: normalizeBroadcasts(competition?.broadcasts),
      link: normalizeEventLink(event.links),
      awayTeam: normalizeTeam(away.team, away),
      homeTeam: normalizeTeam(home.team, home),
      awayScore: away.score,
      homeScore: home.score,
      completed: Boolean(competition?.status?.type?.completed)
    });
  }

  return [...byId.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function filterMatchesByLocalDate(matches, dateKey, timeZone) {
  return matches.filter(
    (match) => getDateKeyInTimezone(match.date, timeZone) === dateKey
  );
}

export function createNotificationMessage(matches, dateKey, timeZone, displayDate) {
  if (!matches.length) {
    return `${displayDate} 没有世界杯比赛。可以保持关注，页面会在下一个比赛日自动刷新。`;
  }

  const firstMatch = matches[0];
  const firstTime = formatMessageTime(firstMatch.date, timeZone);
  const headline =
    matches.length === 1
      ? `${firstMatch.awayTeam.name} vs ${firstMatch.homeTeam.name}`
      : `${firstMatch.awayTeam.name} vs ${firstMatch.homeTeam.name} 等 ${matches.length} 场`;

  return `${displayDate} 世界杯比赛日：${headline}，最早 ${firstTime} 开球。打开通知页查看场地、转播与完整赛程。`;
}

function normalizeTeam(team, competitor = {}) {
  return {
    name: team.displayName || team.shortDisplayName || team.name,
    abbreviation: team.abbreviation || "",
    logo: team.logo || "",
    form: competitor.form || "",
    record: normalizeRecord(competitor.records)
  };
}

function normalizeRecord(records = []) {
  const total = records.find((record) => record.type === "total") || records[0];
  return total?.summary || "";
}

function normalizeGroupLabel(label = "") {
  return String(label)
    .replace("FIFA World Cup,", "")
    .replace("group-stage", "Group Stage")
    .trim();
}

function normalizeVenueCity(address = {}) {
  return [address.city, address.country].filter(Boolean).join(", ");
}

function normalizeBroadcasts(broadcasts = []) {
  const names = broadcasts.flatMap((broadcast) => broadcast.names || []);
  return [...new Set(names)].filter(Boolean);
}

function normalizeEventLink(links = []) {
  const summary = links.find((link) => link.rel?.includes("summary")) || links[0];
  return summary?.href || "";
}

function formatMessageTime(isoDate, timeZone) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(isoDate));
}
