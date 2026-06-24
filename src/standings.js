const ESPN_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";

export function buildStandingsUrl(season = 2026) {
  const url = new URL(ESPN_STANDINGS_URL);
  url.searchParams.set("season", String(season));
  return url.toString();
}

export async function fetchStandings(fetcher = fetch, season = 2026) {
  const response = await fetcher(buildStandingsUrl(season));
  if (!response.ok) {
    throw new Error(`ESPN standings request failed: ${response.status}`);
  }

  return normalizeStandings(await response.json());
}

export function normalizeStandings(payload) {
  const groups = [];
  const teams = {};

  for (const child of payload.children || []) {
    const groupName = child.name || child.abbreviation || "";
    const entries = (child.standings?.entries || []).map((entry, index) => {
      const stats = normalizeStats(entry.stats);
      const standing = {
        teamName: entry.team?.displayName || entry.team?.name || "",
        abbreviation: entry.team?.abbreviation || "",
        group: groupName,
        rank: index + 1,
        note: entry.note?.description || "",
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        draws: stats.ties,
        losses: stats.losses,
        points: stats.points,
        goalsFor: stats.pointsFor,
        goalsAgainst: stats.pointsAgainst,
        goalDifference: stats.pointDifferential,
        qualificationStatus: classifyQualification(entry.note?.description, index + 1),
        source: "standings"
      };

      if (standing.teamName) {
        teams[standing.teamName] = standing;
      }
      if (standing.abbreviation) {
        teams[standing.abbreviation] = standing;
      }
      return standing;
    });

    groups.push({
      name: groupName,
      entries
    });
  }

  return {
    groups,
    teams
  };
}

export function getTeamStanding(standings, team) {
  if (!standings?.teams || !team) {
    return null;
  }

  return standings.teams[team.name] || standings.teams[team.abbreviation] || null;
}

export function inferStandingsForMatches(matches) {
  const teams = {};

  for (const match of matches) {
    const group = match.group || "";
    teams[match.awayTeam.name] = inferStandingFromTeam(match.awayTeam, group);
    teams[match.homeTeam.name] = inferStandingFromTeam(match.homeTeam, group);

    if (match.awayTeam.abbreviation) {
      teams[match.awayTeam.abbreviation] = teams[match.awayTeam.name];
    }
    if (match.homeTeam.abbreviation) {
      teams[match.homeTeam.abbreviation] = teams[match.homeTeam.name];
    }
  }

  return {
    groups: [],
    teams
  };
}

export function describeQualification(standing) {
  if (!standing) {
    return "形势未知";
  }

  if (standing.qualificationStatus === "direct") {
    return "当前直接出线区";
  }
  if (standing.qualificationStatus === "wildcard") {
    return "第三名竞争区";
  }
  if (standing.qualificationStatus === "eliminated") {
    return "已被标记淘汰";
  }
  if (standing.qualificationStatus === "chasing") {
    return "需抢分追赶";
  }
  return "形势未知";
}

function normalizeStats(stats = []) {
  const normalized = {
    gamesPlayed: 0,
    wins: 0,
    ties: 0,
    losses: 0,
    points: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifferential: 0
  };

  for (const stat of stats) {
    if (stat.name in normalized) {
      normalized[stat.name] = parseStatValue(stat.displayValue ?? stat.value);
    }
  }

  return normalized;
}

function inferStandingFromTeam(team, group) {
  const record = parseRecord(team.record);
  const rank = inferRankFromPoints(record.points);

  return {
    teamName: team.name,
    abbreviation: team.abbreviation || "",
    group,
    rank,
    note: "",
    gamesPlayed: record.gamesPlayed,
    wins: record.wins,
    draws: record.draws,
    losses: record.losses,
    points: record.points,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    qualificationStatus: classifyQualification("", rank),
    source: "record"
  };
}

function parseRecord(record = "") {
  const [wins = 0, losses = 0, draws = 0] = record
    .split("-")
    .map((part) => Number(part));
  const safeWins = Number.isFinite(wins) ? wins : 0;
  const safeLosses = Number.isFinite(losses) ? losses : 0;
  const safeDraws = Number.isFinite(draws) ? draws : 0;

  return {
    wins: safeWins,
    losses: safeLosses,
    draws: safeDraws,
    gamesPlayed: safeWins + safeLosses + safeDraws,
    points: safeWins * 3 + safeDraws
  };
}

function inferRankFromPoints(points) {
  if (points >= 4) {
    return 1;
  }
  if (points >= 3) {
    return 2;
  }
  if (points >= 1) {
    return 3;
  }
  return 4;
}

function classifyQualification(note = "", rank = 0) {
  const normalized = note.toLowerCase();

  if (normalized.includes("eliminated")) {
    return "eliminated";
  }
  if (normalized.includes("best 8")) {
    return "wildcard";
  }
  if (normalized.includes("advance")) {
    return "direct";
  }
  if (rank <= 2) {
    return "direct";
  }
  if (rank === 3) {
    return "wildcard";
  }
  if (rank >= 4) {
    return "chasing";
  }
  return "unknown";
}

function parseStatValue(value) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(String(value).replace("+", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
