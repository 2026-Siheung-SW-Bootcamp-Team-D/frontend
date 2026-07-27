const TITLES = {
  home: "연당",
  join: "모임 참여 · 연당",
  "create-board": "새 모임 만들기 · 연당",
  board: "모임 지도 · 연당",
  "place-detail": "장소 상세 · 연당",
  "area-search": "동네 찾기 · 연당",
  nearby: "주변 탐색 · 연당",
  course: "우리 모임 코스 · 연당",
  profile: "내 출발지 · 연당",
  "not-found": "페이지를 찾을 수 없어요 · 연당",
};

export function titleForRoute(route) {
  return TITLES[route?.route] ?? TITLES["not-found"];
}
