import assert from "node:assert/strict";
import test from "node:test";
import * as mappers from "./mappers.js";

test("출발지 후보는 장소를 먼저 보여주고 같은 좌표의 주소를 제거한다", () => {
  assert.equal(typeof mappers.mergeOriginCandidates, "function");

  const candidates = mappers.mergeOriginCandidates(
    [{
      providerPlaceId: "poi-1",
      name: "강남역 2호선",
      roadAddress: "서울 강남구 강남대로 396",
      jibunAddress: "서울 강남구 역삼동 858",
      lat: 37.498,
      lon: 127.028,
    }],
    [{
      label: "서울 강남구",
      roadAddress: "",
      lat: 37.498,
      lon: 127.028,
    }, {
      label: "서울 강남구 테헤란로 1",
      roadAddress: "서울 강남구 테헤란로 1",
      lat: 37.499,
      lon: 127.029,
    }],
  );

  assert.deepEqual(candidates, [{
    label: "강남역 2호선",
    roadAddress: "서울 강남구 강남대로 396",
    lat: 37.498,
    lon: 127.028,
    source: "KAKAO_KEYWORD",
    providerPlaceId: "poi-1",
  }, {
    label: "서울 강남구 테헤란로 1",
    roadAddress: "서울 강남구 테헤란로 1",
    lat: 37.499,
    lon: 127.029,
    source: "KAKAO_ADDRESS",
    providerPlaceId: null,
  }]);
});
