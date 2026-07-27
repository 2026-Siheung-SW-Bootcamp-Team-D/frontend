import test from "node:test";
import assert from "node:assert/strict";
import { getPlaceDetailTarget } from "./placeDetailTarget.js";

test("검색 후보는 외부 상세 URL을 사용한다", () => {
  assert.deepEqual(
    getPlaceDetailTarget("board-1", {
      id: "search-1",
      kind: "search",
      sourceUrl: "https://place.map.kakao.com/123",
    }),
    { kind: "external", url: "https://place.map.kakao.com/123" },
  );
});

test("저장된 장소는 보드 내부 상세 경로를 사용한다", () => {
  assert.deepEqual(
    getPlaceDetailTarget("board 1", { id: "place/1" }),
    { kind: "internal", path: "/boards/board%201/places/place%2F1" },
  );
});

test("안전하지 않거나 없는 상세 URL은 열지 않는다", () => {
  assert.equal(getPlaceDetailTarget("board-1", { kind: "search", sourceUrl: "javascript:alert(1)" }), null);
  assert.equal(getPlaceDetailTarget("board-1", { kind: "search" }), null);
});
