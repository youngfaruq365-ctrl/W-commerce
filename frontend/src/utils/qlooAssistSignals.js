/**
 * Qloo Assist Signals
 * Lightweight, framework-free detector that decides when a shopper is struggling to find
 * an ingredient / material, then notifies the global <QlooAssistPopup /> via a window event.
 *
 * Triggers:
 *  - zero_results  : a search returned nothing
 *  - repeat_search : 3+ different searches within 3 minutes with few/no results
 *  - help_phrase   : the query reads like a plea for help ("where can I find...", "substitute for...")
 */

export const QLOO_ASSIST_EVENT = 'qloo:assist';

const HISTORY_KEY = 'qloo_assist_history_v1';
const DISMISS_KEY = 'qloo_assist_dismissed_v1';
const WINDOW_MS = 3 * 60 * 1000;
const DISMISS_COOLDOWN_MS = 10 * 60 * 1000;

const HELP_PHRASES = [
  /where (can|do) i (find|get|buy)/i,
  /(can'?t|cannot|unable to|struggling to|hard to) find/i,
  /substitute for|replacement for|alternative (to|for)|instead of/i,
  /what (can|do) i use (for|instead)/i,
  /need help|help me find/i
];

const safeParse = (raw, fallback) => {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};

const readHistory = () => safeParse(sessionStorage.getItem(HISTORY_KEY), []);
const writeHistory = (h) => {
  try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-12))); } catch { /* storage unavailable */ }
};

const readDismissed = () => safeParse(sessionStorage.getItem(DISMISS_KEY), {});

export const hasHelpIntent = (query = '') => HELP_PHRASES.some((rx) => rx.test(String(query)));

export const dismissAssistFor = (query = '') => {
  const key = String(query).trim().toLowerCase();
  if (!key) return;
  const map = readDismissed();
  map[key] = Date.now();
  try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
};

const wasRecentlyDismissed = (query) => {
  const at = readDismissed()[String(query).trim().toLowerCase()];
  return Boolean(at && Date.now() - at < DISMISS_COOLDOWN_MS);
};

const emit = (detail) => {
  window.dispatchEvent(new CustomEvent(QLOO_ASSIST_EVENT, { detail }));
};

/**
 * Report a completed search so we can decide whether the shopper needs help.
 * Safe to call repeatedly; duplicate consecutive queries are ignored.
 */
export const reportSearch = (query, resultCount) => {
  const q = String(query || '').trim();
  if (q.length < 3 || typeof window === 'undefined') return;
  if (wasRecentlyDismissed(q)) return;

  const now = Date.now();
  const history = readHistory().filter((h) => now - h.at < WINDOW_MS);
  const last = history[history.length - 1];
  if (last && last.q.toLowerCase() === q.toLowerCase()) return;

  history.push({ q, count: resultCount, at: now });
  writeHistory(history);

  const recentQueries = history.map((h) => h.q);
  let reason = null;

  if (hasHelpIntent(q)) reason = 'help_phrase';
  else if (resultCount === 0) reason = 'zero_results';
  else if (history.length >= 3 && history.filter((h) => h.count <= 2).length >= 2) reason = 'repeat_search';

  if (reason) emit({ query: q, reason, resultCount, recentQueries });
};

/** Manual trigger, e.g. from a "Need help finding something?" button. */
export const requestQlooAssist = (query, reason = 'manual') => {
  const q = String(query || '').trim();
  if (q.length < 2) return;
  emit({ query: q, reason, resultCount: null, recentQueries: readHistory().map((h) => h.q) });
};
