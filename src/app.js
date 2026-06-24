import {
  DEFAULT_TIMEZONE,
  addDaysToDateKey,
  formatDisplayDate,
  formatKickoffTime,
  formatUpdatedAt,
  getBrowserTimezone,
  getDateKeyInTimezone
} from "./date.js";
import {
  createNotificationMessage,
  fetchMatchesForDate,
  fetchNextMatchday,
  getFallbackNextMatchday,
  getFallbackMatchesForDate
} from "./schedule.js";
import { formatPredictionLine, predictMatches } from "./prediction.js";

const state = {
  dateKey: getDateKeyInTimezone(new Date(), DEFAULT_TIMEZONE),
  timeZone: DEFAULT_TIMEZONE,
  matches: [],
  message: "",
  source: "loading",
  nextMatchday: {
    dateKey: "",
    matches: [],
    predictions: [],
    source: "loading"
  }
};

const elements = {
  dateInput: document.querySelector("#date-input"),
  timezoneSelect: document.querySelector("#timezone-select"),
  todayButton: document.querySelector("#today-button"),
  refreshButton: document.querySelector("#refresh-button"),
  copyButton: document.querySelector("#copy-button"),
  notifyButton: document.querySelector("#notify-button"),
  dataSourceBadge: document.querySelector("#data-source-badge"),
  message: document.querySelector("#notification-message"),
  matchCount: document.querySelector("#match-count"),
  firstKickoff: document.querySelector("#first-kickoff"),
  updatedAt: document.querySelector("#updated-at"),
  dateLabel: document.querySelector("#date-label"),
  matchList: document.querySelector("#match-list"),
  template: document.querySelector("#match-card-template"),
  predictionSourceBadge: document.querySelector("#prediction-source-badge"),
  predictionDateLabel: document.querySelector("#prediction-date-label"),
  predictionList: document.querySelector("#prediction-list"),
  predictionTemplate: document.querySelector("#prediction-card-template")
};

initialize();

function initialize() {
  state.timeZone = getInitialTimezone();
  state.dateKey = getDateKeyInTimezone(new Date(), state.timeZone);

  elements.timezoneSelect.value = state.timeZone;
  elements.dateInput.value = state.dateKey;

  elements.dateInput.addEventListener("change", () => {
    state.dateKey = elements.dateInput.value;
    loadSchedule();
  });

  elements.timezoneSelect.addEventListener("change", () => {
    state.timeZone = elements.timezoneSelect.value;
    loadSchedule();
  });

  elements.todayButton.addEventListener("click", () => {
    state.dateKey = getDateKeyInTimezone(new Date(), state.timeZone);
    elements.dateInput.value = state.dateKey;
    loadSchedule();
  });

  elements.refreshButton.addEventListener("click", () => loadSchedule({ force: true }));
  elements.copyButton.addEventListener("click", copyNotificationMessage);
  elements.notifyButton.addEventListener("click", sendBrowserNotification);

  setInterval(refreshOnDateChange, 60 * 1000);
  loadSchedule();
}

async function loadSchedule({ force = false } = {}) {
  setSourceBadge("loading", "正在获取");
  resetPredictionState();
  setPredictionBadge("loading", "正在预测");
  elements.refreshButton.disabled = true;

  try {
    const cached = force ? null : readCachedSchedule(state.dateKey, state.timeZone);
    const matches =
      cached ||
      (await fetchMatchesForDate(state.dateKey, state.timeZone).then((remoteMatches) => {
        writeCachedSchedule(state.dateKey, state.timeZone, remoteMatches);
        return remoteMatches;
      }));

    state.matches = matches;
    state.source = cached ? "cache" : "live";
    render();
    await loadPredictions({ force });
  } catch (error) {
    console.warn(error);
    state.matches = getFallbackMatchesForDate(state.dateKey, state.timeZone);
    state.source = state.matches.length ? "fallback" : "error";
    render();
    await loadPredictions({ force, preferFallback: true });
  } finally {
    elements.refreshButton.disabled = false;
  }
}

function resetPredictionState() {
  state.nextMatchday = {
    dateKey: "",
    matches: [],
    predictions: [],
    source: "loading"
  };
}

async function loadPredictions({ force = false, preferFallback = false } = {}) {
  try {
    const cached = force
      ? null
      : readCachedPrediction(state.dateKey, state.timeZone);
    const nextMatchday =
      cached ||
      (preferFallback
        ? getFallbackNextMatchday(state.dateKey, state.timeZone)
        : await fetchNextMatchday(state.dateKey, state.timeZone));

    if (!cached && !preferFallback) {
      writeCachedPrediction(state.dateKey, state.timeZone, nextMatchday);
    }

    state.nextMatchday = {
      ...nextMatchday,
      predictions: predictMatches(nextMatchday.matches),
      source: cached ? "cache" : preferFallback ? "fallback" : "live"
    };
  } catch (error) {
    console.warn(error);
    const nextMatchday = getFallbackNextMatchday(state.dateKey, state.timeZone);
    state.nextMatchday = {
      ...nextMatchday,
      predictions: predictMatches(nextMatchday.matches),
      source: nextMatchday.matches.length ? "fallback" : "error"
    };
  }

  renderPredictions();
}

function render() {
  const displayDate = formatDisplayDate(state.dateKey, state.timeZone);
  state.message = createNotificationMessage(
    state.matches,
    state.dateKey,
    state.timeZone,
    displayDate
  );

  elements.message.textContent = state.message;
  elements.matchCount.textContent = String(state.matches.length);
  elements.firstKickoff.textContent = state.matches[0]
    ? formatKickoffTime(state.matches[0].date, state.timeZone)
    : "--";
  elements.updatedAt.textContent = formatUpdatedAt(new Date(), state.timeZone);
  elements.dateLabel.textContent = `${displayDate} · ${state.timeZone}`;

  renderSource();
  renderMatches();
  renderPredictions();
}

function renderSource() {
  if (state.source === "live") {
    setSourceBadge("live", "实时数据");
  } else if (state.source === "cache") {
    setSourceBadge("cache", "本地缓存");
  } else if (state.source === "fallback") {
    setSourceBadge("fallback", "回退数据");
  } else {
    setSourceBadge("error", "无可用数据");
  }
}

function renderMatches() {
  elements.matchList.replaceChildren();

  if (!state.matches.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "这个日期没有可展示的世界杯比赛。请选择相邻日期或稍后刷新。";
    elements.matchList.append(empty);
    return;
  }

  for (const match of state.matches) {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    card.querySelector(".away-logo").src = match.awayTeam.logo;
    card.querySelector(".away-logo").alt = `${match.awayTeam.name} logo`;
    card.querySelector(".away-name").textContent = match.awayTeam.name;
    card.querySelector(".home-logo").src = match.homeTeam.logo;
    card.querySelector(".home-logo").alt = `${match.homeTeam.name} logo`;
    card.querySelector(".home-name").textContent = match.homeTeam.name;

    const kickoff = card.querySelector(".kickoff-time");
    kickoff.dateTime = match.date;
    kickoff.textContent = formatKickoffTime(match.date, state.timeZone);
    card.querySelector(".match-state").textContent = getStatusText(match);
    card.querySelector(".group-label").textContent = match.group || "FIFA World Cup";
    card.querySelector(".venue-label").textContent = [match.venue, match.city]
      .filter(Boolean)
      .join(" · ");
    card.querySelector(".broadcast-label").textContent = match.broadcasts?.length
      ? `转播：${match.broadcasts.join(" / ")}`
      : "转播信息待更新";
    elements.matchList.append(card);
  }
}

function renderPredictions() {
  elements.predictionList.replaceChildren();
  renderPredictionSource();

  if (state.nextMatchday.source === "loading") {
    elements.predictionDateLabel.textContent = "正在寻找下一个比赛日";
    const loading = document.createElement("p");
    loading.className = "empty-state";
    loading.textContent = "正在生成预测...";
    elements.predictionList.append(loading);
    return;
  }

  if (!state.nextMatchday.matches.length) {
    elements.predictionDateLabel.textContent = "未来 14 天暂无可预测比赛";
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有找到下一个比赛日。稍后刷新或选择更早日期后再试。";
    elements.predictionList.append(empty);
    return;
  }

  const displayDate = formatDisplayDate(
    state.nextMatchday.dateKey,
    state.timeZone
  );
  elements.predictionDateLabel.textContent = `${displayDate} · ${state.timeZone}`;

  for (const prediction of state.nextMatchday.predictions) {
    const card = elements.predictionTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector(".prediction-teams").textContent =
      `${prediction.awayTeam.name} vs ${prediction.homeTeam.name}`;
    card.querySelector(".prediction-score").textContent =
      `${prediction.awayGoals} - ${prediction.homeGoals}`;
    card.querySelector(".prediction-winner").textContent = prediction.winner;
    card.querySelector(".prediction-confidence").textContent =
      `置信度 ${prediction.confidence}%`;
    card.querySelector(".prediction-kickoff").textContent =
      `${formatKickoffTime(prediction.kickoff, state.timeZone)} · ${prediction.group || "FIFA World Cup"}`;
    card.querySelector(".prob-away").textContent =
      `${prediction.awayTeam.name} ${prediction.probabilities.awayWin}%`;
    card.querySelector(".prob-draw").textContent =
      `平局 ${prediction.probabilities.draw}%`;
    card.querySelector(".prob-home").textContent =
      `${prediction.homeTeam.name} ${prediction.probabilities.homeWin}%`;
    card.setAttribute("aria-label", formatPredictionLine(prediction));
    elements.predictionList.append(card);
  }
}

function renderPredictionSource() {
  if (state.nextMatchday.source === "loading") {
    setPredictionBadge("loading", "正在预测");
  } else if (state.nextMatchday.source === "live") {
    setPredictionBadge("live", "实时预测");
  } else if (state.nextMatchday.source === "cache") {
    setPredictionBadge("cache", "缓存预测");
  } else if (state.nextMatchday.source === "fallback") {
    setPredictionBadge("fallback", "回退预测");
  } else {
    setPredictionBadge("error", "暂无预测");
  }
}

function getStatusText(match) {
  if (match.completed) {
    return `${match.awayScore ?? "-"} : ${match.homeScore ?? "-"}`;
  }
  return match.status || "Scheduled";
}

function setSourceBadge(kind, text) {
  elements.dataSourceBadge.className = `source-badge ${kind}`;
  elements.dataSourceBadge.textContent = text;
}

function setPredictionBadge(kind, text) {
  elements.predictionSourceBadge.className = `source-badge ${kind}`;
  elements.predictionSourceBadge.textContent = text;
}

async function copyNotificationMessage() {
  await navigator.clipboard.writeText(state.message);
  const original = elements.copyButton.textContent;
  elements.copyButton.textContent = "已复制";
  window.setTimeout(() => {
    elements.copyButton.textContent = original;
  }, 1400);
}

async function sendBrowserNotification() {
  if (!("Notification" in window)) {
    alert("当前浏览器不支持桌面通知。");
    return;
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    return;
  }

  new Notification("世界杯比赛日提醒", {
    body: state.message,
    icon: "https://a.espncdn.com/i/leaguelogos/soccer/500/4.png"
  });
}

function refreshOnDateChange() {
  const currentDateKey = getDateKeyInTimezone(new Date(), state.timeZone);
  if (currentDateKey !== state.dateKey) {
    state.dateKey = currentDateKey;
    elements.dateInput.value = currentDateKey;
    loadSchedule({ force: true });
  }
}

function getInitialTimezone() {
  const browserTimezone = getBrowserTimezone();
  const optionValues = [...elements.timezoneSelect.options].map((option) => option.value);
  return optionValues.includes(browserTimezone) ? browserTimezone : DEFAULT_TIMEZONE;
}

function cacheKey(dateKey, timeZone) {
  return `world-cup-fixtures:${dateKey}:${timeZone}`;
}

function readCachedSchedule(dateKey, timeZone) {
  const raw = localStorage.getItem(cacheKey(dateKey, timeZone));
  if (!raw) {
    return null;
  }

  try {
    const cached = JSON.parse(raw);
    const isFresh = Date.now() - cached.createdAt < 6 * 60 * 60 * 1000;
    return isFresh ? cached.matches : null;
  } catch {
    return null;
  }
}

function writeCachedSchedule(dateKey, timeZone, matches) {
  localStorage.setItem(
    cacheKey(dateKey, timeZone),
    JSON.stringify({
      createdAt: Date.now(),
      matches
    })
  );
}

function predictionCacheKey(dateKey, timeZone) {
  return `world-cup-next-predictions:${dateKey}:${timeZone}`;
}

function readCachedPrediction(dateKey, timeZone) {
  const raw = localStorage.getItem(predictionCacheKey(dateKey, timeZone));
  if (!raw) {
    return null;
  }

  try {
    const cached = JSON.parse(raw);
    const isFresh = Date.now() - cached.createdAt < 6 * 60 * 60 * 1000;
    return isFresh ? cached.nextMatchday : null;
  } catch {
    return null;
  }
}

function writeCachedPrediction(dateKey, timeZone, nextMatchday) {
  localStorage.setItem(
    predictionCacheKey(dateKey, timeZone),
    JSON.stringify({
      createdAt: Date.now(),
      nextMatchday
    })
  );
}
