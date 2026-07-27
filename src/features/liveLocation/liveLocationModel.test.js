import assert from "node:assert/strict";
import test from "node:test";
import { formatLastSeen, shouldSendLocation } from "./liveLocationModel.js";

test("위치 전송은 최초, 이동 후 15초, 정지 상태 30초 heartbeat에만 허용한다", () => {
  const point = { lat: 37.5, lon: 127, accuracyMeters: 10 };
  assert.equal(shouldSendLocation(null, point, 0), true);
  const previous = { ...point, sentAt: 0 };
  assert.equal(shouldSendLocation(previous, { ...point, lat: 37.5001 }, 14_999), false);
  assert.equal(shouldSendLocation(previous, { ...point, lat: 37.5001 }, 15_000), true);
  assert.equal(shouldSendLocation(previous, point, 29_999), false);
  assert.equal(shouldSendLocation(previous, point, 30_000), true);
});

test("마지막 확인 문구는 안전하게 표시한다", () => {
  assert.equal(formatLastSeen("2026-07-27T10:00:00Z", Date.parse("2026-07-27T10:00:04Z")), "방금 전");
  assert.equal(formatLastSeen("2026-07-27T10:00:00Z", Date.parse("2026-07-27T10:00:38Z")), "38초 전");
  assert.equal(formatLastSeen("2026-07-27T10:00:00Z", Date.parse("2026-07-27T10:02:00Z")), "2분 전");
  assert.equal(formatLastSeen("bad-date"), "");
});
