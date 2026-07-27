import assert from "node:assert/strict";
import test from "node:test";
import { collectPolylinePoints } from "./mapGeometry.js";

test("지도 bounds에 유효한 경로 좌표만 포함한다", () => {
  assert.deepEqual(collectPolylinePoints([
    { path: [{ lat: 37.5, lon: 127 }, { lat: 999, lon: 127 }] },
    { path: [{ lat: 37.6, lon: 126.9 }] },
  ]), [[127, 37.5], [126.9, 37.6]]);
});
