import assert from "node:assert/strict";
import test from "node:test";
import { moveCoursePlace, orderPlacesByLikes, removeCoursePlace } from "./courseModel.js";

test("중간 장소를 위로 한 칸 이동한다", () => {
  assert.deepEqual(moveCoursePlace(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
});

test("범위를 벗어난 이동은 기존 순서를 유지한다", () => {
  assert.deepEqual(moveCoursePlace(["a", "b"], "a", -1), ["a", "b"]);
});

test("코스에서 지정한 장소만 제거한다", () => {
  assert.deepEqual(removeCoursePlace(["a", "b", "c"], "b"), ["a", "c"]);
});

test("보드 목록은 좋아요가 많은 장소부터 보여 준다", () => {
  const places = [{ id: "one", likeCount: 1 }, { id: "three", likeCount: 3 }, { id: "two", likeCount: 2 }];
  assert.deepEqual(orderPlacesByLikes(places), [places[1], places[2], places[0]]);
  assert.deepEqual(places, [{ id: "one", likeCount: 1 }, { id: "three", likeCount: 3 }, { id: "two", likeCount: 2 }]);
});

test("좋아요 동률은 서버에서 받은 기존 순서를 유지한다", () => {
  const places = [{ id: "first", likeCount: 2 }, { id: "second", likeCount: 2 }, { id: "third", likeCount: 1 }];
  assert.deepEqual(orderPlacesByLikes(places), [places[0], places[1], places[2]]);
});
