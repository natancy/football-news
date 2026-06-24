export const PREDICTION_MODEL = {
  name: "Elo-Poisson",
  version: "2.0.0",
  label: "Elo-Poisson v2",
  maxGoals: 6
};

const TEAM_RATINGS = {
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
  "United States": 1665,
  Mexico: 1660,
  Senegal: 1655,
  Japan: 1650,
  Denmark: 1645,
  Austria: 1635,
  Ecuador: 1625,
  Türkiye: 1625,
  "South Korea": 1620,
  Czechia: 1610,
  Norway: 1605,
  Australia: 1600,
  Paraguay: 1600,
  Canada: 1595,
  Egypt: 1585,
  Iran: 1580,
  Scotland: 1575,
  Serbia: 1570,
  "Côte d'Ivoire": 1565,
  "Bosnia-Herzegovina": 1560,
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
  "Cabo Verde": 1480
};

const DEFAULT_RATING = 1500;
const BASE_TOTAL_GOALS = 2.55;
const HOST_COUNTRIES = new Map([
  ["USA", ["USA", "United States"]],
  ["United States", ["USA", "United States"]],
  ["Canada", ["Canada"]],
  ["Mexico", ["Mexico"]]
]);

export function predictMatches(matches) {
  return matches.map((match) => predictMatch(match));
}

export function predictMatch(match) {
  const awayProfile = createTeamProfile(match.awayTeam);
  const homeProfile = createTeamProfile(match.homeTeam);
  const venueAdjustments = getVenueAdjustments(match);
  const awayStrength = awayProfile.rating + venueAdjustments.away;
  const homeStrength = homeProfile.rating + venueAdjustments.home;
  const ratingDiff = homeStrength - awayStrength;
  const expectedGoals = calculateExpectedGoals({
    awayProfile,
    homeProfile,
    ratingDiff
  });
  const matrix = createScoreMatrix(
    expectedGoals.away,
    expectedGoals.home,
    PREDICTION_MODEL.maxGoals
  );
  const probabilities = calculateOutcomeProbabilities(matrix);
  const score = getMostLikelyScore(matrix);
  const outcome = getLikelyOutcome(probabilities);
  const winner =
    outcome === "draw"
      ? "平局"
      : outcome === "home"
        ? `${match.homeTeam.name} 胜`
        : `${match.awayTeam.name} 胜`;

  return {
    matchId: match.id,
    model: PREDICTION_MODEL.label,
    awayTeam: match.awayTeam,
    homeTeam: match.homeTeam,
    kickoff: match.date,
    group: match.group,
    outcome,
    winner,
    awayGoals: score.awayGoals,
    homeGoals: score.homeGoals,
    confidence: Math.round(probabilities[outcome] * 100),
    exactScoreConfidence: Math.round(score.probability * 100),
    probabilities: toRoundedPercentages(probabilities),
    expectedGoals: {
      away: roundToOneDecimal(expectedGoals.away),
      home: roundToOneDecimal(expectedGoals.home)
    },
    factors: {
      awayRating: Math.round(awayStrength),
      homeRating: Math.round(homeStrength),
      ratingDiff: Math.round(ratingDiff),
      neutralVenue: venueAdjustments.home === 0 && venueAdjustments.away === 0
    }
  };
}

export function formatPredictionLine(prediction) {
  return `${prediction.awayTeam.name} ${prediction.awayGoals}-${prediction.homeGoals} ${prediction.homeTeam.name}，${prediction.winner}`;
}

function createTeamProfile(team) {
  const baseRating = TEAM_RATINGS[team.name] || DEFAULT_RATING;
  const adjustedRating =
    baseRating + getFormAdjustment(team.form) + getRecordAdjustment(team.record);
  const ratingDelta = adjustedRating - DEFAULT_RATING;

  return {
    rating: adjustedRating,
    attackIndex: clamp(1 + ratingDelta / 1700, 0.72, 1.34),
    defenseIndex: clamp(1 + ratingDelta / 1900, 0.76, 1.28)
  };
}

function getFormAdjustment(form = "") {
  if (!form) {
    return 0;
  }

  const points = [...form.slice(-5)].reduce((total, result) => {
    if (result === "W") {
      return total + 3;
    }
    if (result === "D") {
      return total + 1;
    }
    return total;
  }, 0);

  return (points - 7) * 7;
}

function getRecordAdjustment(record = "") {
  const parts = record.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  const [wins, losses, draws] = parts;
  return (wins * 3 + draws - losses * 2) * 3;
}

function getVenueAdjustments(match) {
  const venueText = `${match.venue || ""} ${match.city || ""}`;
  return {
    away: getHostCountryBoost(match.awayTeam.name, venueText),
    home: getHostCountryBoost(match.homeTeam.name, venueText)
  };
}

function getHostCountryBoost(teamName, venueText) {
  const countryNames = HOST_COUNTRIES.get(teamName);
  if (!countryNames) {
    return 0;
  }

  return countryNames.some((country) => venueText.includes(country)) ? 35 : 0;
}

function calculateExpectedGoals({ awayProfile, homeProfile, ratingDiff }) {
  const homeShare = sigmoid(ratingDiff / 390);
  const attackPressure =
    (awayProfile.attackIndex + homeProfile.attackIndex - 2) * 0.32;
  const totalGoals = clamp(BASE_TOTAL_GOALS + attackPressure, 1.75, 3.35);
  const homeAttackEdge = homeProfile.attackIndex / awayProfile.defenseIndex;
  const awayAttackEdge = awayProfile.attackIndex / homeProfile.defenseIndex;
  const homeExpected = totalGoals * homeShare * clamp(homeAttackEdge, 0.78, 1.24);
  const awayExpected =
    totalGoals * (1 - homeShare) * clamp(awayAttackEdge, 0.78, 1.24);

  return {
    away: clamp(awayExpected, 0.25, 3.8),
    home: clamp(homeExpected, 0.25, 3.8)
  };
}

function createScoreMatrix(awayExpected, homeExpected, maxGoals) {
  const awayDistribution = poissonDistribution(awayExpected, maxGoals);
  const homeDistribution = poissonDistribution(homeExpected, maxGoals);
  const matrix = [];

  for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals += 1) {
    for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals += 1) {
      matrix.push({
        awayGoals,
        homeGoals,
        probability: awayDistribution[awayGoals] * homeDistribution[homeGoals]
      });
    }
  }

  return matrix;
}

function poissonDistribution(lambda, maxGoals) {
  const distribution = [];
  let total = 0;

  for (let goals = 0; goals < maxGoals; goals += 1) {
    const probability = (Math.exp(-lambda) * lambda ** goals) / factorial(goals);
    distribution.push(probability);
    total += probability;
  }

  distribution.push(Math.max(0, 1 - total));
  return distribution;
}

function calculateOutcomeProbabilities(matrix) {
  const probabilities = {
    away: 0,
    draw: 0,
    home: 0
  };

  for (const score of matrix) {
    if (score.homeGoals > score.awayGoals) {
      probabilities.home += score.probability;
    } else if (score.homeGoals < score.awayGoals) {
      probabilities.away += score.probability;
    } else {
      probabilities.draw += score.probability;
    }
  }

  return probabilities;
}

function getMostLikelyScore(matrix) {
  return matrix.reduce((best, score) =>
    score.probability > best.probability ? score : best
  );
}

function getLikelyOutcome(probabilities) {
  const entries = Object.entries(probabilities);
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function toRoundedPercentages(probabilities) {
  const raw = {
    awayWin: probabilities.away * 100,
    draw: probabilities.draw * 100,
    homeWin: probabilities.home * 100
  };
  const rounded = {
    awayWin: Math.floor(raw.awayWin),
    draw: Math.floor(raw.draw),
    homeWin: Math.floor(raw.homeWin)
  };
  let remainder =
    100 - rounded.awayWin - rounded.draw - rounded.homeWin;
  const order = Object.entries(raw)
    .map(([key, value]) => [key, value - Math.floor(value)])
    .sort((a, b) => b[1] - a[1]);

  for (const [key] of order) {
    if (remainder <= 0) {
      break;
    }
    rounded[key] += 1;
    remainder -= 1;
  }

  return rounded;
}

function factorial(value) {
  let result = 1;
  for (let current = 2; current <= value; current += 1) {
    result *= current;
  }
  return result;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}
