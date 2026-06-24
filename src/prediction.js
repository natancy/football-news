const BASE_TEAM_RATINGS = {
  Argentina: 1890,
  France: 1875,
  Spain: 1845,
  England: 1830,
  Brazil: 1820,
  Portugal: 1810,
  Netherlands: 1785,
  Germany: 1765,
  Uruguay: 1745,
  Belgium: 1735,
  Croatia: 1725,
  Colombia: 1715,
  Morocco: 1705,
  Switzerland: 1685,
  USA: 1665,
  Mexico: 1660,
  Senegal: 1655,
  Japan: 1650,
  Denmark: 1645,
  Austria: 1635,
  Ecuador: 1625,
  "South Korea": 1620,
  Norway: 1605,
  Australia: 1600,
  Canada: 1595,
  Scotland: 1575,
  Serbia: 1570,
  "Côte d'Ivoire": 1565,
  "Congo DR": 1555,
  Ghana: 1550,
  Algeria: 1545,
  Tunisia: 1540,
  "South Africa": 1535,
  Qatar: 1525,
  Panama: 1520,
  Uzbekistan: 1515,
  "Saudi Arabia": 1510,
  Jordan: 1505,
  Iraq: 1505,
  Haiti: 1495,
  "New Zealand": 1490,
  Curaçao: 1485,
  "Cabo Verde": 1480,
  "Bosnia-Herzegovina": 1560,
  Czechia: 1610,
  Sweden: 1640,
  Türkiye: 1625,
  Paraguay: 1600,
  Egypt: 1585,
  Iran: 1580
};

const DEFAULT_RATING = 1500;
const DRAW_BASE_RATE = 0.26;

export function predictMatches(matches) {
  return matches.map((match) => predictMatch(match));
}

export function predictMatch(match) {
  const awayRating = getTeamRating(match.awayTeam) + getFormAdjustment(match.awayTeam);
  const homeRating =
    getTeamRating(match.homeTeam) + getFormAdjustment(match.homeTeam) + 18;
  const diff = homeRating - awayRating;
  const drawPressure = 1 - Math.min(Math.abs(diff), 420) / 420;
  const drawProbability = clamp(DRAW_BASE_RATE + drawPressure * 0.08, 0.18, 0.34);
  const homeShare = sigmoid(diff / 215);
  const decisivePool = 1 - drawProbability;
  const homeWinProbability = decisivePool * homeShare;
  const awayWinProbability = decisivePool * (1 - homeShare);

  const outcome = pickOutcome(match.id, {
    home: homeWinProbability,
    draw: drawProbability,
    away: awayWinProbability
  });
  const score = predictScore(match, diff, outcome);
  const winner =
    outcome === "draw"
      ? "平局"
      : outcome === "home"
        ? `${match.homeTeam.name} 胜`
        : `${match.awayTeam.name} 胜`;

  return {
    matchId: match.id,
    awayTeam: match.awayTeam,
    homeTeam: match.homeTeam,
    kickoff: match.date,
    group: match.group,
    outcome,
    winner,
    awayGoals: score.awayGoals,
    homeGoals: score.homeGoals,
    confidence: Math.round(
      Math.max(homeWinProbability, drawProbability, awayWinProbability) * 100
    ),
    probabilities: {
      awayWin: Math.round(awayWinProbability * 100),
      draw: Math.round(drawProbability * 100),
      homeWin: Math.round(homeWinProbability * 100)
    }
  };
}

export function formatPredictionLine(prediction) {
  return `${prediction.awayTeam.name} ${prediction.awayGoals}-${prediction.homeGoals} ${prediction.homeTeam.name}，${prediction.winner}`;
}

function getTeamRating(team) {
  return BASE_TEAM_RATINGS[team.name] || DEFAULT_RATING;
}

function getFormAdjustment(team) {
  if (!team.form) {
    return 0;
  }

  const points = [...team.form.slice(-5)].reduce((total, result) => {
    if (result === "W") {
      return total + 3;
    }
    if (result === "D") {
      return total + 1;
    }
    return total;
  }, 0);

  return (points - 7) * 6;
}

function pickOutcome(seed, probabilities) {
  const jitter = seededRandom(`${seed}:outcome`) * 0.08 - 0.04;
  const adjustedHome = probabilities.home + jitter;
  const adjustedAway = probabilities.away - jitter;
  const maxValue = Math.max(adjustedHome, probabilities.draw, adjustedAway);

  if (maxValue === probabilities.draw) {
    return "draw";
  }
  return maxValue === adjustedHome ? "home" : "away";
}

function predictScore(match, diff, outcome) {
  const noiseA = seededRandom(`${match.id}:away`) - 0.5;
  const noiseH = seededRandom(`${match.id}:home`) - 0.5;
  const homeExpected = clamp(1.25 + diff / 360 + noiseH * 0.45, 0.25, 3.6);
  const awayExpected = clamp(1.2 - diff / 380 + noiseA * 0.45, 0.25, 3.4);

  let homeGoals = Math.round(homeExpected);
  let awayGoals = Math.round(awayExpected);

  if (outcome === "home" && homeGoals <= awayGoals) {
    homeGoals = awayGoals + 1;
  }

  if (outcome === "away" && awayGoals <= homeGoals) {
    awayGoals = homeGoals + 1;
  }

  if (outcome === "draw") {
    const level = Math.max(0, Math.round((homeExpected + awayExpected) / 2));
    homeGoals = level;
    awayGoals = level;
  }

  return {
    awayGoals: clampInteger(awayGoals, 0, 5),
    homeGoals: clampInteger(homeGoals, 0, 5)
  };
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampInteger(value, min, max) {
  return Math.trunc(clamp(value, min, max));
}

function seededRandom(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}
