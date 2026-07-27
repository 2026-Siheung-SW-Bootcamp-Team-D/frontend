import assert from "node:assert/strict";
import test from "node:test";
import { moveCoursePlace, removeCoursePlace } from "./courseModel.js";

test("중간 장소를 위로 한 칸 이동한다", () => {
  assert.deepEqual(moveCoursePlace(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
});

test("범위를 벗어난 이동은 기존 순서를 유지한다", () => {
  assert.deepEqual(moveCoursePlace(["a", "b"], "a", -1), ["a", "b"]);
});

test("코스에서 지정한 장소만 제거한다", () => {
  assert.deepEqual(removeCoursePlace(["a", "b", "c"], "b"), ["a", "c"]);
});
