const MOVE_INTERVAL_MS = 15_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

export function isLiveCoordinate(value) {
  return Number.isFinite(value?.lat)
    && Number.isFinite(value?.lon)
    && value.lat >= -90 && value.lat <= 90
    && value.lon >= -180 && value.lon <= 180;
}

export function shouldSendLocation(previous, next, now) {
  if (!isLiveCoordinate(next) || !Number.isFinite(now)) return false;
  if (!previous) return true;
  const elapsed = now - previous.sentAt;
  if (elapsed >= HEARTBEAT_INTERVAL_MS) return true;
  const moved = previous.lat !== next.lat || previous.lon !== next.lon || previous.accuracyMeters !== next.accuracyMeters;
  return moved && elapsed >= MOVE_INTERVAL_MS;
}

export function formatLastSeen(updatedAt, now = Date.now()) {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return "";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 10) return "방금 전";
  if (seconds < 60) return `${seconds}초 전`;
  return `${Math.floor(seconds / 60)}분 전`;
}
