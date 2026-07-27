import assert from "node:assert/strict";
import test from "node:test";
import { titleForRoute } from "./routeMeta.js";

test("각 주요 화면에 연당 브라우저 제목을 제공한다", () => {
  assert.equal(titleForRoute({ route: "home" }), "연당");
  assert.equal(titleForRoute({ route: "create-board" }), "새 모임 만들기 · 연당");
  assert.equal(titleForRoute({ route: "board" }), "모임 지도 · 연당");
  assert.equal(titleForRoute({ route: "course" }), "우리 모임 코스 · 연당");
  assert.equal(titleForRoute({ route: "not-found" }), "페이지를 찾을 수 없어요 · 연당");
});

test("알 수 없는 화면도 안전한 404 제목으로 수렴한다", () => {
  assert.equal(titleForRoute({ route: "unexpected" }), "페이지를 찾을 수 없어요 · 연당");
});
