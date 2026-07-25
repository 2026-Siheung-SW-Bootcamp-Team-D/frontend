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
      Object.entries(parsed).filter(([boardId, session]) => boardId.trim() && isSession(session)),
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

export { STORAGE_KEY };
