/*
 * FLOW A. 시작·참여 (PG-01 ~ PG-02)
 * FLOW B. 장소 모으기 (PG-03 ~ PG-06)
 *
 * 기준 문서: docs `specs/기능명세서_v1.3.md` §7
 * 각 화면은 URL을 가진 독립 페이지다. 버튼·카드를 누르면 다음 화면으로 실제로 이동한다.
 * 초록색 → 표시는 그 요소가 어디로 이어지는지 알려 주는 학습용 안내다.
 */

import {
  Button,
  Chip,
  Field,
  FlowHint,
  Label,
  ListCard,
  Note,
  PageShell,
  Placeholder,
  Row,
  Sub,
  SubTitle,
  TabBar,
  Title,
} from '../../components/wireframe/Primitives.jsx'

export function HomePage() {
  return (
    <PageShell
      id="PG-01"
      title="홈"
      note="로그인 없이 시작한다. 참여 이력은 브라우저에 저장된 참여 토큰으로만 찾는다."
    >
      <Title>약속 올인원</Title>
      <Sub>로그인 없이 약속을 만들고 참여해요</Sub>

      <Button to="/boards/new" variant="primary" full>
        + 새 약속 보드 만들기
      </Button>
      <FlowHint>새 보드 만들기 → PG-02</FlowHint>

      <Label>초대 코드로 참여</Label>
      <Row>
        <Placeholder grow>초대 코드 6~10자</Placeholder>
        <Button to="/boards/1">참여</Button>
      </Row>

      <Label>진행 중인 약속</Label>
      <ListCard
        to="/boards/1"
        title="주말 모임"
        meta="장소 5 · 댓글 12 · COLLECTING"
      />
      <ListCard
        to="/boards/1/confirmed"
        title="동아리 회식"
        meta="장소 3 · 댓글 4 · CONFIRMED"
      />
      <FlowHint>진행 중인 약속 카드 → 상태에 따라 PG-05 또는 PG-13</FlowHint>

      <Note>F01-04 잘못된 코드·삭제된 보드는 입력값을 유지한 채 안내한다</Note>
    </PageShell>
  )
}

export function CreateBoardPage() {
  return (
    <PageShell
      id="PG-02"
      title="약속 보드 생성"
      backTo="/"
      note="생성과 동시에 호스트 참여 토큰이 발급된다. 초대 링크에는 토큰을 넣지 않는다."
    >
      <Title>새 약속 보드</Title>
      <Field label="약속 이름 *" placeholder="2~40자" />
      <Field label="후보 날짜 *" placeholder="오늘 이후 · 최대 30일" />
      <Field label="목적 (선택)" placeholder="100자 이하" />

      <Label>보드 생성 후 바로 장소를 검색할까요?</Label>
      <Row>
        <Button to="/boards/1/search">장소 검색하기</Button>
        <Button to="/boards/1">건너뛰기</Button>
      </Row>

      <Button to="/boards/1" variant="primary" full>
        약속 보드 만들기
      </Button>
      <FlowHint>만들기 → PG-05 장소 보드 (검색하기를 고르면 PG-03)</FlowHint>

      <Note>
        F02-05 생성 결과: 보드 ID · 초대 코드 · 초대 링크 (호스트 토큰 미포함)
      </Note>
    </PageShell>
  )
}

export function PlaceSearchPage() {
  return (
    <PageShell
      id="PG-03"
      title="장소 검색"
      backTo="/boards/1"
      note="입력할 때마다 호출하지 않는다. Kakao Local은 유료 API라 명시적 검색에만 부른다."
    >
      <Title>장소 검색</Title>
      <Row>
        <Placeholder grow>예: 강남역 스타벅스</Placeholder>
        <Button to="/boards/1/search" variant="primary">
          검색
        </Button>
      </Row>
      <Note>
        F03-02 입력 중 자동 호출 금지 · Enter 또는 검색 버튼으로만 호출
      </Note>

      <Label>검색 결과 (최대 5개)</Label>
      <ListCard
        to="/boards/1/search/confirm"
        title="긴자료코 부평점"
        meta="음식점 · 인천 부평구 경원대로"
      />
      <ListCard
        to="/boards/1/search/confirm"
        title="스타벅스 강남대로점"
        meta="카페 · 서울 강남구 강남대로"
      />
      <ListCard
        to="/boards/1/search/confirm"
        title="정왕역 4호선"
        meta="지하철역 · 경기 시흥시"
      />
      <FlowHint>검색 결과를 고르면 → PG-04 확인 화면</FlowHint>

      <Note>
        F03-04 결과가 없으면 지역·지점명을 더해 다시 검색하도록 안내한다
      </Note>
      <Button to="/boards/1">검색 취소</Button>
    </PageShell>
  )
}

export function SelectResultPage() {
  return (
    <PageShell
      id="PG-04"
      title="검색 결과 선택"
      backTo="/boards/1/search"
      note="이 화면이 있어서 엉뚱한 지점이 자동 등록되지 않는다. 핵심 안전장치."
    >
      <Title>이 장소가 맞나요?</Title>
      <Placeholder size="lg">
        지도 미리보기 · 선택 후보 마커 (Kakao Maps)
      </Placeholder>
      <SubTitle>긴자료코 부평점</SubTitle>
      <Sub>인천 부평구 경원대로 · 도로명/지번 주소</Sub>
      <Sub>음식점 · 일식 · 돈까스,우동</Sub>

      <Button to="/boards/1" variant="primary" full>
        이 장소로 등록하기
      </Button>
      <FlowHint>등록하면 → PG-05 장소 보드에 카드로 추가</FlowHint>
      <Note>BR-003 / F04-02 자동 확정 금지 — 사용자가 반드시 선택한다</Note>

      <Row>
        <Button to="/boards/1/search">다시 검색</Button>
        <Button to="/boards/1">지도에서 직접 지정</Button>
      </Row>
      <Note tone="accent">
        직접 지정 시 좌표는 필수, 주소는 선택. 도로명 주소가 없으면 지번을 쓴다
        (PoC 실측: coord2address가 도로명을 null로 주는 경우가 있음)
      </Note>
    </PageShell>
  )
}

export function PlaceBoardPage() {
  return (
    <PageShell
      id="PG-05"
      title="장소 보드"
      backTo="/"
      note="여러 사람이 모은 장소를 지도와 카드로 함께 본다. 이 서비스의 허브 화면."
    >
      <Title>주말 모임</Title>
      <TabBar active="장소 보드" />
      <Placeholder size="lg">Kakao Maps · 장소 마커 A·B·C</Placeholder>

      <Row>
        <Chip active>전체</Chip>
        <Chip>맛집</Chip>
        <Chip>카페</Chip>
        <Chip>놀거리</Chip>
      </Row>
      <Sub>정렬: 최근 추가순</Sub>

      <ListCard
        to="/boards/1/places/a"
        title="A. 긴자료코 부평점"
        meta="음식점 · 제안 종민 · 댓글 3 · 좋아요 2"
      />
      <ListCard
        to="/boards/1/places/a"
        title="B. 스타벅스 강남대로점"
        meta="카페 · 제안 하늘 · 댓글 1"
      />
      <ListCard
        to="/boards/1/places/a"
        title="C. 국립서울현충원"
        meta="관광명소 · 제안 지우 · 댓글 0"
      />
      <FlowHint>장소 카드 → PG-06 상세·댓글 / 상단 탭 → PG-11·PG-10</FlowHint>

      <Button to="/boards/1/search" variant="primary" full>
        + 장소 추가 (검색 또는 지도 핀)
      </Button>
      <Button to="/boards/1/area" full>
        만나기 좋은 지역 찾기
      </Button>
      <FlowHint>지역 찾기 → PG-07 (유료 API를 쓰는 유일한 구간)</FlowHint>

      <Note>
        BR-004 중복 장소를 자동 병합하지 않는다 · F05-06 호스트와 제안자만 삭제
        가능
      </Note>
    </PageShell>
  )
}

export function PlaceDetailPage() {
  return (
    <PageShell
      id="PG-06"
      title="장소 상세·댓글"
      backTo="/boards/1"
      note="장소에 대한 의견이 그 장소에 붙는다. 단톡방에서 흩어지던 대화를 대체하는 자리."
    >
      <Title>긴자료코 부평점</Title>
      <Sub>음식점 · 일식 · 인천 부평구 경원대로</Sub>
      <Placeholder size="md">지도 · 해당 장소 마커</Placeholder>

      <Row>
        <Button>카카오맵</Button>
        <Button>네이버지도</Button>
      </Row>
      <Note>
        F06-02 저장된 좌표·장소명으로 링크를 만든다. 앱이 없으면 웹 URL로
        연결한다 (실제 구현에서는 외부 지도가 열리므로 여기서는 동작하지 않음)
      </Note>

      <Label>댓글 3</Label>
      <ListCard
        title="종민"
        meta="여기 웨이팅 길어요. 6시 전에 가는 게 좋아요"
      />
      <ListCard title="하늘" meta="부평역에서 도보 5분이라 접근성 좋음" />
      <Placeholder>댓글 입력 (1~500자)</Placeholder>
      <Row>
        <Button variant="primary">등록</Button>
        <Chip>좋아요 2</Chip>
      </Row>
    </PageShell>
  )
}
