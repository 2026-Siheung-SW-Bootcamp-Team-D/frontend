/*
 * FLOW C. 만나기 좋은 지역 찾기 (PG-07 ~ PG-09)
 * FLOW D. 결정·코스 구성 (PG-10 ~ PG-12)
 *
 * 기준 문서: docs `specs/기능명세서_v1.3.md` §7
 * Flow C가 이 서비스의 차별화 지점이자 외부 유료 API를 실제로 쓰는 유일한 구간이라
 * 호스트가 버튼을 눌렀을 때만 실행한다(BR-002).
 */

import {
  Button,
  Chip,
  FlowHint,
  Label,
  LegHint,
  ListCard,
  Note,
  PageShell,
  Placeholder,
  Row,
  Sub,
  TabBar,
  Title,
} from '../../components/wireframe/Primitives.jsx'

export function AreaSearchPage() {
  return (
    <PageShell
      id="PG-07"
      title="만나기 좋은 지역 찾기"
      backTo="/boards/1"
      note="출발지가 흩어졌을 때만 쓰는 기능. ODsay 도달권과 TMAP 이동시간을 조합해 계산한다."
    >
      <Title>만나기 좋은 지역 찾기</Title>

      <Label>참여자 출발지 현황</Label>
      <ListCard title="종민 (나)" meta="입력 완료 · 정왕역" />
      <ListCard title="하늘" meta="입력 완료" />
      <ListCard title="지우" meta="미입력" />
      <Note>
        BR-010 다른 참여자에게는 완료 여부만 보인다. 상세 주소는 본인과 서버만
        안다
      </Note>

      <Label>내 출발 장소</Label>
      <Placeholder>건물·역 이름 또는 도로명 주소 검색</Placeholder>

      <Label>도달시간 범위</Label>
      <Row>
        <Chip>30분</Chip>
        <Chip active>45분</Chip>
        <Chip>60분</Chip>
      </Row>

      <Button to="/boards/1/area/result" variant="primary" full>
        지역 찾기 실행 (호스트)
      </Button>
      <FlowHint>실행하면 → PG-08 계산 결과</FlowHint>
      <Note>
        BR-002 호스트가 버튼을 누른 경우에만 실행한다 · F07-05 실행 전 예상 API
        호출량을 안내한다
      </Note>
    </PageShell>
  )
}

export function AreaComparePage() {
  return (
    <PageShell
      id="PG-08"
      title="지역과 기존 장소 비교"
      backTo="/boards/1/area"
      note="계산 결과를 숫자와 함께 보여준다. 추천 이유는 지표로 검증 가능한 문구만 쓴다."
    >
      <Title>추천 지역</Title>
      <Placeholder size="xl">
        도달권 교집합 폴리곤 (면적 상위 3개) + 지역 후보 마커
      </Placeholder>

      <Label>지역 후보 3개</Label>
      <ListCard
        title="1. 신도림역"
        meta="평균 32분 · 최장 41분 · 환승 0.7회"
        highlight
      />
      <ListCard title="2. 부천역" meta="평균 35분 · 최장 38분 · 환승 1.0회" />
      <ListCard
        title="3. 구로디지털단지역"
        meta="평균 29분 · 최장 47분 · 환승 0.3회"
      />
      <Note tone="accent">
        F08-01 교집합이 여러 조각으로 갈라지므로 면적 상위 3개만 후보 탐색에
        쓴다 (PoC 실측: 60분 교집합이 17조각으로 분리됨)
      </Note>

      <Label>기존 보드 장소</Label>
      <ListCard title="A. 긴자료코 부평점" meta="지역 안 · 중심에서 1.2km" />
      <ListCard title="C. 국립서울현충원" meta="지역 밖 · 중심에서 9.4km" />

      <Button to="/boards/1/area/nearby" full>
        이 지역 근처에서 더 찾기
      </Button>
      <Button to="/boards/1/decide" variant="primary" full>
        이 지역으로 장소 결정하러 가기
      </Button>
      <FlowHint>근처 탐색 → PG-09 / 결정하러 가기 → PG-10</FlowHint>

      <Note>
        BR-009 리뷰·평점·인기도는 쓰지 않는다. 평균·최장시간·환승·거리만 근거로
        삼는다
      </Note>
    </PageShell>
  )
}

export function NearbyPage() {
  return (
    <PageShell
      id="PG-09"
      title="근처에서 더 찾기 (P1)"
      backTo="/boards/1/area/result"
      note="확정한 지역 주변에서 코스에 넣을 장소를 찾는다. MVP 이후 기능."
    >
      <Title>신도림역 근처에서 더 찾기</Title>
      <Row>
        <Chip active>맛집</Chip>
        <Chip>카페</Chip>
        <Chip>놀거리</Chip>
        <Chip>술집</Chip>
      </Row>
      <Note tone="accent">
        놀거리 = 문화시설(CT1) + 관광명소(AT4) + 노래방·볼링장·PC방 키워드.
        검색어 &quot;놀거리&quot;는 결과가 0건이라 쓰지 않는다 (PoC KL-06)
      </Note>
      <Note tone="accent">
        반경 1km로 조회하고 결과가 5개 미만이면 3km로 한 단계 확대한다
        (지방·외곽 관광명소가 1km에서 0~1건까지 떨어짐)
      </Note>

      <Placeholder size="md">지도 · 반경 원 + 후보 마커</Placeholder>
      <ListCard title="○○식당" meta="음식점 · 320m" />
      <ListCard title="△△카페" meta="카페 · 450m" />
      <ListCard title="□□문화센터" meta="문화시설 · 780m" />
      <Sub>거리는 직선거리 기준</Sub>

      <Button to="/boards/1" variant="primary" full>
        선택한 장소 보드에 추가
      </Button>
      <FlowHint>추가하면 → PG-05 장소 보드</FlowHint>
    </PageShell>
  )
}

export function VotePage() {
  return (
    <PageShell
      id="PG-10"
      title="투표·장소 결정"
      backTo="/boards/1"
      note="투표는 필수가 아니다. 의견이 갈릴 때만 연다."
    >
      <Title>주말 모임</Title>
      <TabBar active="결정" />

      <Label>장소 투표 · 마감 오늘 22:00</Label>
      <ListCard title="A. 긴자료코 부평점" meta="3표" highlight />
      <ListCard title="B. 스타벅스 강남대로점" meta="1표" />
      <ListCard title="C. 국립서울현충원" meta="0표" />
      <Sub>4/5명 투표 완료 · 마감 전 변경 가능</Sub>

      <Button to="/boards/1/course" variant="primary" full>
        투표 종료 (호스트)
      </Button>
      <Note>
        BR-011 투표는 선택 기능이다. 호스트는 투표 없이 바로 확정할 수 있다
      </Note>
      <Button to="/boards/1/course" full>
        투표 없이 코스 후보 확정
      </Button>
      <FlowHint>둘 중 무엇을 눌러도 → PG-11 코스 만들기</FlowHint>
    </PageShell>
  )
}

export function CoursePage() {
  return (
    <PageShell
      id="PG-11"
      title="코스 만들기"
      backTo="/boards/1/decide"
      note="여러 장소를 방문 순서로 묶는 것이 이 서비스의 Wow 포인트다."
    >
      <Title>코스 만들기</Title>
      <TabBar active="코스" />
      <Sub>드래그로 순서 변경 · 최대 10개</Sub>

      <ListCard
        title="1. 긴자료코 부평점  [첫 만남]"
        meta="역할 식사 · 도착 18:00"
        highlight
      />
      <LegHint>약 4분(추정) · 직선 280m</LegHint>
      <ListCard title="2. 스타벅스 강남대로점" meta="역할 카페 · 도착 19:30" />
      <LegHint>약 9분(추정) · 직선 640m</LegHint>
      <ListCard title="3. □□문화센터" meta="역할 놀거리 · 도착 20:30" />

      <Note>BR-005 1번은 반드시 첫 만남 장소이며 코스당 하나만 존재한다</Note>
      <Note>
        BR-008 도보 추정 = 직선거리 ÷ 분당 70m. 정밀 경로가 아니므로 항상
        &quot;추정&quot;을 붙인다
      </Note>

      <Button to="/boards/1/course/map" variant="primary" full>
        번호 지도로 확인하기
      </Button>
      <FlowHint>→ PG-12 번호 지도</FlowHint>
    </PageShell>
  )
}

export function NumberedMapPage() {
  return (
    <PageShell
      id="PG-12"
      title="번호 지도"
      backTo="/boards/1/course"
      note="첫 만남과 이후 일정이 지도에서 한눈에 구분되는 화면. 시연의 핵심 장면."
    >
      <Title>번호 지도</Title>
      <Placeholder size="xl">
        ① 강조(큰 마커·첫 만남) ② ③ 순서 마커 + 직선 연결선
      </Placeholder>
      <Note>F12-02 연결선은 실제 길찾기 경로가 아님을 범례로 표시한다</Note>

      <Label>코스 요약</Label>
      <ListCard
        title="장소 3곳 · 18:00 ~ 20:30"
        meta="구간 거리 합계 약 920m · 추정 13분"
      />
      <Sub>추정치와 확정시각을 구분해 표시한다</Sub>

      <Button to="/boards/1/confirmed" variant="primary" full>
        코스 확정 (호스트)
      </Button>
      <FlowHint>확정하면 → PG-13 확정 일정</FlowHint>
      <Note>
        F12-05 확정하면 새 버전이 저장되고 확정 일정·공개 공유 페이지가 갱신된다
      </Note>
    </PageShell>
  )
}
