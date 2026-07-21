/*
 * FLOW E. 확정·공유 (PG-13 ~ PG-15)
 * FLOW F. 운영 (PG-16, P1)
 *
 * 기준 문서: docs `specs/기능명세서_v1.3.md` §7
 * 확정 이후 각자가 실제로 움직이도록 돕는 구간이다. 상세 길찾기는 외부 지도에 넘긴다.
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
  Title,
} from '../../components/wireframe/Primitives.jsx'

export function ConfirmedPage() {
  return (
    <PageShell
      id="PG-13"
      title="확정 일정"
      backTo="/boards/1"
      note="모든 참여자가 같은 확정 버전을 본다. 일정이 바뀌면 이전 출발 안내는 만료된다."
    >
      <Title>확정된 일정</Title>
      <Sub>주말 모임 · 7/26 (토)</Sub>

      <ListCard
        title="① 18:00  긴자료코 부평점"
        meta="첫 만남 · 식사"
        highlight
      />
      <LegHint>약 4분(추정) · 280m</LegHint>
      <ListCard title="② 19:30  스타벅스 강남대로점" meta="카페" />
      <LegHint>약 9분(추정) · 640m</LegHint>
      <ListCard title="③ 20:30  □□문화센터" meta="놀거리" />

      <Row>
        <Button>카카오맵</Button>
        <Button>네이버지도</Button>
      </Row>
      <Note>
        F13-04 최신 확정 버전 v2 · 7/21 14:02 수정 — 이전 출발 안내는 만료
        처리한다
      </Note>

      <Button to="/boards/1/departure" variant="primary" full>
        내 출발 안내 보기
      </Button>
      <Button to="/s/ab12cd" full>
        공개 링크 열어 보기
      </Button>
      <FlowHint>출발 안내 → PG-14 / 공개 링크 → PG-15</FlowHint>
    </PageShell>
  )
}

export function DeparturePage() {
  return (
    <PageShell
      id="PG-14"
      title="내 출발 안내"
      backTo="/boards/1/confirmed"
      note="확정 후 개인이 실제로 쓰는 화면. 첫 만남 장소에 대해서만 계산한다(BR-006)."
    >
      <Title>내 출발 안내</Title>
      <Sub>첫 만남: 긴자료코 부평점 · 18:00</Sub>

      <div className="rounded-xl bg-blue-50 px-4 py-4">
        <p className="text-[22px] font-semibold text-neutral-900">
          권장 출발 17:18
        </p>
        <p className="mt-1 text-[11px] text-neutral-500">
          출발 = 만남시각 − 이동 32분 − 여유 10분
        </p>
      </div>

      <ListCard title="이동 요약" meta="32분 · 환승 1회 · 1,550원" />
      <Note tone="accent">
        F14-03 현재 시간표 기준 추정 — 미래 배차는 달라질 수 있다
      </Note>

      <Button variant="primary" full>
        네이버지도 대중교통 길찾기
      </Button>
      <Button full>카카오맵 길찾기 (P1)</Button>
      <Note tone="accent">
        카카오맵 웹 길찾기는 자동차 모드로 기본 진입한다. 그래서 대중교통은
        네이버지도를 기본 버튼으로 둔다 (PoC 실측)
      </Note>

      <Label>이후 코스</Label>
      <ListCard
        to="/boards/1/confirmed"
        title="② 19:30 스타벅스 · ③ 20:30 문화센터"
        meta="2번 이후는 개인 경로를 계산하지 않고 구간 추정만 보여준다"
      />
    </PageShell>
  )
}

export function PublicSharePage() {
  return (
    <PageShell
      id="PG-15"
      title="약속 공유 페이지"
      tone="public"
      note="링크를 받은 사람이 로그인 없이 보는 화면. 참여자 전용 화면과 구분하려고 배경색을 다르게 했다."
    >
      <Title>주말 모임</Title>
      <Sub>7/26 (토) 18:00 · 첫 만남 긴자료코 부평점</Sub>
      <Placeholder size="lg">
        공개 번호 지도 ① ② ③ (출발지·투표 상세 제외)
      </Placeholder>

      <ListCard title="① 18:00 긴자료코 부평점" meta="인천 부평구 경원대로" />
      <ListCard
        title="② 19:30 스타벅스 강남대로점"
        meta="서울 강남구 강남대로"
      />
      <ListCard title="③ 20:30 □□문화센터" meta="서울 구로구" />

      <Row>
        <Button>카카오맵</Button>
        <Button>네이버지도</Button>
      </Row>
      <Note>
        BR-010 / F15-02 개인 출발지·참여 토큰·댓글 작성자·투표 상세를 응답에서
        제외한다
      </Note>
      <Sub>최신 확정 버전 v2 (7/21 14:02)</Sub>
      <Button variant="primary" full>
        링크 복사
      </Button>
      <Note>
        이 화면에는 뒤로 가기가 없다. 보드 참여자가 아니라 링크만 받은 사람이
        보는 페이지이기 때문이다
      </Note>
    </PageShell>
  )
}

export function OpsPage() {
  return (
    <PageShell
      id="PG-16"
      title="운영 대시보드 (P1)"
      note="유료 API를 쓰는 서비스라 호출량·비용·실패율을 눈으로 봐야 한다."
    >
      <Title>운영 대시보드</Title>
      <Row>
        <Chip active>오늘</Chip>
        <Chip>7일</Chip>
        <Chip>30일</Chip>
      </Row>

      <Placeholder size="sm">
        API 사용량 차트 · Kakao Maps/Local · TMAP Transit · ODsay
      </Placeholder>
      <Placeholder size="sm">일·월 누적 예상 비용</Placeholder>
      <Placeholder size="sm">성공률 · p50/p95 지연시간 · 오류 코드</Placeholder>
      <Placeholder size="sm">작업 큐 대기/실행/실패/재시도</Placeholder>

      <ListCard
        title="Rate limit 경보"
        meta="Kakao Local 70% 도달 · TMAP Transit 429 증가"
      />
      <ListCard
        title="캐시 적중률 (P2)"
        meta="장소·주소 82% · ODsay 도달권 64% · TMAP 경로 71%"
      />
      <Note>F16-03 지표 라벨에 개인정보·검색어 원문을 포함하지 않는다</Note>
    </PageShell>
  )
}
