import test from "node:test";
import assert from "node:assert/strict";
import {
  bottomSheetLabel,
  bottomSheetMobileHeight,
  toggleBottomSheet,
} from "./bottomSheetModel.js";

test("축소된 바텀시트는 확장 상태로 전환된다", () => {
  assert.equal(toggleBottomSheet(false), true);
  assert.equal(bottomSheetLabel(false), "바텀시트 펼치기");
});

test("확장된 바텀시트는 축소 상태로 전환된다", () => {
  assert.equal(toggleBottomSheet(true), false);
  assert.equal(bottomSheetLabel(true), "바텀시트 접기");
});

test("확장 상태는 모바일 화면 대부분을 사용한다", () => {
  assert.equal(bottomSheetMobileHeight(true, "max-h-[48dvh]"), "max-h-[82dvh]");
  assert.equal(bottomSheetMobileHeight(false, "max-h-[48dvh]"), "max-h-[48dvh]");
});
