/*
 * 해시 기반 라우팅.
 *
 * `react-router`가 설치되어 있지 않고(AGENTS.md) 의존성 추가는 별도 합의 사항이라,
 * 브라우저 기본 기능만으로 URL별 페이지 이동을 만든다.
 * 링크는 그냥 `<a href="#/경로">`라서 뒤로가기·앞으로가기가 그대로 동작한다.
 *
 * URL은 실제 서비스에서 쓸 법한 형태로 임의 배정했다. 보드 ID·공개 토큰 자리는
 * 고정값(`1`, `ab12cd`)을 넣어 두었고, 실제 구현에서 동적 세그먼트로 바뀐다.
 */

import { useSyncExternalStore } from 'react'

import {
  HomePage,
  CreateBoardPage,
  PlaceSearchPage,
  SelectResultPage,
  PlaceBoardPage,
  PlaceDetailPage,
} from './pages/wireframe/flowAB.jsx'
import {
  AreaSearchPage,
  AreaComparePage,
  NearbyPage,
  VotePage,
  CoursePage,
  NumberedMapPage,
} from './pages/wireframe/flowCD.jsx'
import {
  ConfirmedPage,
  DeparturePage,
  PublicSharePage,
  OpsPage,
} from './pages/wireframe/flowEF.jsx'

/** 화면 목록 페이지 경로. ROUTES에는 넣지 않고 App에서 따로 처리한다(순환 import 방지). */
export const SCREEN_INDEX_PATH = '/_index'

export const ROUTES = [
  { path: '/', id: 'PG-01', flow: 'A', title: '홈', Component: HomePage },
  {
    path: '/boards/new',
    id: 'PG-02',
    flow: 'A',
    title: '약속 보드 생성',
    Component: CreateBoardPage,
  },
  {
    path: '/boards/1/search',
    id: 'PG-03',
    flow: 'B',
    title: '장소 검색',
    Component: PlaceSearchPage,
  },
  {
    path: '/boards/1/search/confirm',
    id: 'PG-04',
    flow: 'B',
    title: '검색 결과 선택',
    Component: SelectResultPage,
  },
  {
    path: '/boards/1',
    id: 'PG-05',
    flow: 'B',
    title: '장소 보드',
    Component: PlaceBoardPage,
  },
  {
    path: '/boards/1/places/a',
    id: 'PG-06',
    flow: 'B',
    title: '장소 상세·댓글',
    Component: PlaceDetailPage,
  },
  {
    path: '/boards/1/area',
    id: 'PG-07',
    flow: 'C',
    title: '만나기 좋은 지역 찾기',
    Component: AreaSearchPage,
  },
  {
    path: '/boards/1/area/result',
    id: 'PG-08',
    flow: 'C',
    title: '지역과 기존 장소 비교',
    Component: AreaComparePage,
  },
  {
    path: '/boards/1/area/nearby',
    id: 'PG-09',
    flow: 'C',
    title: '근처에서 더 찾기 (P1)',
    Component: NearbyPage,
  },
  {
    path: '/boards/1/decide',
    id: 'PG-10',
    flow: 'D',
    title: '투표·장소 결정',
    Component: VotePage,
  },
  {
    path: '/boards/1/course',
    id: 'PG-11',
    flow: 'D',
    title: '코스 만들기',
    Component: CoursePage,
  },
  {
    path: '/boards/1/course/map',
    id: 'PG-12',
    flow: 'D',
    title: '번호 지도',
    Component: NumberedMapPage,
  },
  {
    path: '/boards/1/confirmed',
    id: 'PG-13',
    flow: 'E',
    title: '확정 일정',
    Component: ConfirmedPage,
  },
  {
    path: '/boards/1/departure',
    id: 'PG-14',
    flow: 'E',
    title: '내 출발 안내',
    Component: DeparturePage,
  },
  {
    path: '/s/ab12cd',
    id: 'PG-15',
    flow: 'E',
    title: '약속 공유 페이지',
    Component: PublicSharePage,
  },
  {
    path: '/ops',
    id: 'PG-16',
    flow: 'F',
    title: '운영 대시보드 (P1)',
    Component: OpsPage,
  },
]

export const FLOW_TITLE = {
  A: '시작·참여',
  B: '장소 모으기',
  C: '만나기 좋은 지역 찾기',
  D: '결정·코스 구성',
  E: '확정·공유',
  F: '운영',
}

function subscribe(onStoreChange) {
  window.addEventListener('hashchange', onStoreChange)
  return () => window.removeEventListener('hashchange', onStoreChange)
}

function getSnapshot() {
  return window.location.hash.slice(1) || '/'
}

function getServerSnapshot() {
  return '/'
}

/** 현재 해시 경로를 구독한다. 파생 값은 렌더 중에 계산하므로 state로 두지 않는다. */
export function useHashPath() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
