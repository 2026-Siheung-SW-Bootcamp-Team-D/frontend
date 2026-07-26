const STORAGE_KEY = "yeondang.participantSessions.v1";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function isSession(value) {
  return (
    value
    && typeof value === "object"
    && typeof value.participantToken === "string"
    && value.participantToken.trim().length > 0
    && typeof value.participantId === "string"
    && value.participantId.trim().length > 0
  );
}

function isOptionalText(value) { return value === undefined || (typeof value === "string" && value.trim().length > 0); }
function isOptionalTimestamp(value) { return value === undefined || (typeof value === "string" && Number.isFinite(Date.parse(value))); }
function sessionMetadata(value) {
  return {
    ...(isOptionalText(value.boardName) && value.boardName ? { boardName: value.boardName.trim() } : {}),
    ...(isOptionalTimestamp(value.lastOpenedAt) && value.lastOpenedAt ? { lastOpenedAt: value.lastOpenedAt } : {}),
  };
}

function readSessions() {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return {};
    }

    const validSessions = Object.fromEntries(
      Object.entries(parsed).filter(([boardId, session]) => boardId.trim() && isSession(session) && isOptionalText(session.boardName) && isOptionalTimestamp(session.lastOpenedAt)),
    );

    if (Object.keys(validSessions).length !== Object.keys(parsed).length) {
      writeSessions(validSessions);
    }

    return validSessions;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    return {};
  }
}

function writeSessions(sessions) {
  if (!canUseStorage()) return false;

  try {
    if (Object.keys(sessions).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
    return true;
  } catch {
    return false;
  }
}

export function getBoardSession(boardId) {
  if (typeof boardId !== "string" || !boardId.trim()) return null;
  return readSessions()[boardId] ?? null;
}

export function saveBoardSession(boardId, session) {
  if (typeof boardId !== "string" || !boardId.trim() || !isSession(session)) return false;

  const sessions = readSessions();
  sessions[boardId] = {
    participantToken: session.participantToken,
    participantId: session.participantId,
    ...sessionMetadata(session),
  };
  return writeSessions(sessions);
}

export function clearBoardSession(boardId) {
  if (typeof boardId !== "string" || !boardId.trim()) return false;

  const sessions = readSessions();
  if (!sessions[boardId]) return true;
  delete sessions[boardId];
  return writeSessions(sessions);
}

export function getBoardSessionIds() {
  return Object.keys(readSessions());
}

export function touchBoardSession(boardId, { boardName, lastOpenedAt = new Date().toISOString() } = {}) {
  const sessions = readSessions();
  const current = sessions[boardId];
  if (!current) return false;
  sessions[boardId] = { ...current, ...sessionMetadata({ boardName: boardName ?? current.boardName, lastOpenedAt }) };
  return writeSessions(sessions);
}

export function getRecentBoardSessions() {
  return Object.entries(readSessions())
    .map(([boardId, session]) => ({ boardId, boardName: session.boardName || "참여한 모임", lastOpenedAt: session.lastOpenedAt || "" }))
    .sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt));
}

export { STORAGE_KEY };
