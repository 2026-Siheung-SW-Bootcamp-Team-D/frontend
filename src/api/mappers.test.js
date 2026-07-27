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

test("지역 탐색 응답은 참여자별 도달권과 공통 영역을 함께 보존한다", () => {
  const mapped = mappers.mapAreaSearchJob({
    job: { jobId: "area-1", status: "SUCCEEDED", durationMin: 45 },
    result: {
      participantCenter: { lat: 37.5, lon: 127 },
      isochrones: [{
        areaId: "area-1",
        geometry: {
          type: "Polygon",
          coordinates: [[[127, 37.5], [127.1, 37.5], [127.1, 37.6], [127, 37.5]]],
        },
      }],
      commonArea: {
        type: "Polygon",
        coordinates: [[[127.01, 37.51], [127.02, 37.51], [127.02, 37.52], [127.01, 37.51]]],
      },
      anchors: [{
        anchorId: "anchor-1",
        provider: "KAKAO",
        providerPlaceId: "place-1",
        name: "만남역",
        location: { lat: 37.51, lon: 127.01 },
      }],
    },
  });

  assert.equal(mapped.isochrones.length, 1);
  assert.equal(mapped.commonArea.type, "Polygon");
  assert.equal(mapped.anchors[0].providerPlaceId, "place-1");
});

test("코스 초안은 장소 순서를 보존하고 중복 장소를 제거한다", () => {
  const mapped = mappers.mapCourseDraft({
    version: 3,
    stops: [
      { placeId: "plc-b", orderIndex: 2 },
      { placeId: "plc-a", orderIndex: 1 },
      { placeId: "plc-a", orderIndex: 3 },
    ],
  });

  assert.deepEqual(mapped, {
    version: 3,
    etag: "\"draft-3\"",
    placeIds: ["plc-a", "plc-b"],
  });
});

test("참여자별 이동시간은 상태별 안전한 표시 값만 보존한다", () => {
  const mapped = mappers.mapTransitTimes({
    items: [
      {
        participantId: "ptc-a",
        nickname: "민지",
        avatarColor: "#123456",
        status: "READY",
        totalMinutes: 38,
        transferCount: 1,
        totalWalkMinutes: 7,
      },
      {
        participantId: "ptc-b",
        nickname: "정우",
        avatarColor: "#654321",
        status: "ORIGIN_REQUIRED",
      },
    ],
  });

  assert.deepEqual(mapped, [{
    participantId: "ptc-a",
    nickname: "민지",
    avatarColor: "#123456",
    status: "READY",
    totalMinutes: 38,
    transferCount: 1,
    totalWalkMinutes: 7,
  }, {
    participantId: "ptc-b",
    nickname: "정우",
    avatarColor: "#654321",
    status: "ORIGIN_REQUIRED",
    totalMinutes: null,
    transferCount: null,
    totalWalkMinutes: null,
  }]);
});
