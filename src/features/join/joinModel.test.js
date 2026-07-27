import test from "node:test";
import assert from "node:assert/strict";
import { existingParticipantAction } from "./joinModel.js";

test("초대 보드의 기존 세션이 있으면 모임 복귀를 우선한다", () => {
  assert.deepEqual(
    existingParticipantAction(
      { boardId: "brd-1" },
      { participantId: "ptc-1", participantToken: "token" },
    ),
    { boardId: "brd-1", shouldReturn: true },
  );
});

test("기존 세션이 없으면 새 참여 폼을 유지한다", () => {
  assert.equal(existingParticipantAction({ boardId: "brd-1" }, null), null);
});
