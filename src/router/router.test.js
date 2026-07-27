import assert from "node:assert/strict";
import test from "node:test";
import { parseRoute } from "./routeModel.js";

test("코스 페이지 경로를 보드 일반 경로보다 먼저 인식한다", () => {
  assert.deepEqual(parseRoute("/boards/brd_1/course"), {
    route: "course",
    params: { boardId: "brd_1" },
  });
});
