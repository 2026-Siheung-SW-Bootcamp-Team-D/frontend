import { useEffect, useMemo, useRef, useState } from "react";
import { createAreaSearchJob, getAreaSearchJob } from "../api/areaSearch";
import { createPlace } from "../api/places";
import { ApiError } from "../api/errors";
import { Avatar, Button } from "../components/UI";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";
import { useServerBoard } from "../store/ServerBoardContext";

const MAX_POLLS = 30;
const POLL_DELAY_MS = 1500;
const ACTIVE_STATUSES = new Set(["QUEUED", "RUNNING", "RETRY_WAIT"]);
const ISOCHRONE_STYLES = [
  { strokeColor: "#2563EB", fillColor: "#2563EB", fillOpacity: 0.12, strokeOpacity: 0.75, strokeWeight: 2, zIndex: 0 },
  { strokeColor: "#059669", fillColor: "#059669", fillOpacity: 0.12, strokeOpacity: 0.75, strokeWeight: 2, zIndex: 0 },
  { strokeColor: "#7C3AED", fillColor: "#7C3AED", fillOpacity: 0.12, strokeOpacity: 0.75, strokeWeight: 2, zIndex: 0 },
  { strokeColor: "#D97706", fillColor: "#D97706", fillOpacity: 0.12, strokeOpacity: 0.75, strokeWeight: 2, zIndex: 0 },
];

function messageFor(error) {
  if (error instanceof ApiError) {
    if (error.code === "ORIGIN_REQUIRED" || error.status === 422) return "출발지를 먼저 설정해 주세요.";
    if (error.status === 409) return "모임이 종료되었거나 같은 탐색 작업이 이미 진행 중이에요.";
    if (error.status === 429) return error.retryAfterSeconds ? `${error.retryAfterSeconds}초 뒤 다시 시도해 주세요.` : "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    if ([502, 503].includes(error.status)) return "탐색 서버가 잠시 불안정해요. 잠시 후 다시 시도해 주세요.";
  }
  return "동네를 찾지 못했어요. 다시 시도해 주세요.";
}

export function AreaSearchPage({ boardId }) {
  const { status: boardStatus, participants, reload } = useServerBoard();
  const [duration, setDuration] = useState(45);
  const [job, setJob] = useState(null);
  const [anchors, setAnchors] = useState([]);
  const [isochrones, setIsochrones] = useState([]);
  const [commonArea, setCommonArea] = useState(null);
  const [participantCenter, setParticipantCenter] = useState(null);
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [addingAnchorId, setAddingAnchorId] = useState("");
  const [showExclusionConfirm, setShowExclusionConfirm] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef(null);
  const timerRef = useRef(null);

  function stopPolling() {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }

  useEffect(() => () => stopPolling(), []);

  function setResult(response) {
    setAnchors(response.anchors);
    setIsochrones(response.isochrones);
    setCommonArea(response.commonArea);
    setParticipantCenter(
      Number.isFinite(response.participantCenter?.lat) && Number.isFinite(response.participantCenter?.lon)
        ? response.participantCenter
        : response.anchors[0] ?? null,
    );
  }

  async function poll(jobId, attempt = 0) {
    if (attempt >= MAX_POLLS) {
      setJob((current) => current ? { ...current, status: "TIMED_OUT" } : current);
      setError("탐색 시간이 길어지고 있어요. 잠시 후 다시 시도해 주세요.");
      stopPolling();
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await getAreaSearchJob(boardId, jobId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setJob(response.job);
      if (response.job.status === "SUCCEEDED") {
        setResult(response);
        stopPolling();
      } else if (response.job.status === "FAILED") {
        setError("동네를 찾지 못했어요. 잠시 후 다시 시도해 주세요.");
        stopPolling();
      } else if (ACTIVE_STATUSES.has(response.job.status)) {
        timerRef.current = window.setTimeout(() => poll(jobId, attempt + 1), POLL_DELAY_MS);
      } else {
        setError("탐색 상태를 확인하지 못했어요. 다시 시도해 주세요.");
        stopPolling();
      }
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) {
        if (requestError?.status === 401) await reload(controller.signal);
        if (!controller.signal.aborted) setError(messageFor(requestError));
      }
      if (!controller.signal.aborted) stopPolling();
    }
  }

  async function start(participantIds) {
    setShowExclusionConfirm(false);
    stopPolling();
    setError("");
    setAnchors([]);
    setIsochrones([]);
    setCommonArea(null);
    setParticipantCenter(null);
    setSelectedAnchor(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await createAreaSearchJob(boardId, duration, participantIds, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setJob(response.job);
      if (response.job.status === "SUCCEEDED" || ACTIVE_STATUSES.has(response.job.status)) poll(response.job.id);
      else setError("탐색 작업을 시작하지 못했어요. 다시 시도해 주세요.");
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) {
        if (requestError?.status === 401) await reload(controller.signal);
        if (!controller.signal.aborted) setError(messageFor(requestError));
      }
    }
  }

  async function addAnchor(anchor) {
    if (!anchor || addingAnchorId) return;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setAddingAnchorId(anchor.id);
    setError("");
    try {
      await createPlace(boardId, {
        name: anchor.name,
        category: anchor.category || "지역 제안",
        roadAddress: anchor.roadAddress || null,
        jibunAddress: null,
        location: { lat: anchor.lat, lon: anchor.lon },
        source: {
          sourceProvider: anchor.sourceProvider || "KAKAO",
          providerPlaceId: anchor.providerPlaceId || null,
          sourceUrl: null,
          inputMethod: "SEARCH_PICK",
        },
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      await reload(controller.signal);
      if (!controller.signal.aborted) navigate(`/boards/${boardId}`);
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) setError(messageFor(requestError));
    } finally {
      if (!controller.signal.aborted) setAddingAnchorId("");
    }
  }

  const areaPolygons = useMemo(() => [
    ...isochrones.map((area, index) => ({ ...area, style: ISOCHRONE_STYLES[index % ISOCHRONE_STYLES.length] })),
    ...(commonArea ? [{ id: "common-area", geometry: commonArea }] : []),
  ], [isochrones, commonArea]);
  const participantsWithOrigin = participants.filter((participant) => participant.hasOrigin);
  const participantsWithoutOrigin = participants.filter((participant) => !participant.hasOrigin);

  function requestStart() {
    if (participantsWithOrigin.length < 2) {
      setError("출발지를 등록한 참여자가 2명 이상 필요해요.");
      return;
    }
    if (participantsWithoutOrigin.length > 0) {
      setShowExclusionConfirm(true);
      return;
    }
    start(participantsWithOrigin.map((participant) => participant.id));
  }

  if (boardStatus === "reentry") return <Reentry boardId={boardId} />;
  if (boardStatus === "loading") return <main className="min-h-screen p-5">모임 정보를 불러오는 중이에요.</main>;
  if (boardStatus === "error") return <main className="min-h-screen p-5">모임을 열지 못했어요. <button type="button" className="underline" onClick={() => navigate(`/boards/${boardId}`)}>모임으로 돌아가기</button></main>;

  const running = ACTIVE_STATUSES.has(job?.status);
  const finished = job?.status === "SUCCEEDED";
  const nextDuration = [30, 45, 60].find((minutes) => minutes > (job?.durationMin ?? duration));

  if (finished) {
    return <main className="relative h-screen overflow-hidden bg-[#d7e5df]">
      <KakaoMap className="absolute inset-0" center={selectedAnchor ?? participantCenter ?? undefined} markers={anchors} polygons={areaPolygons} fitBounds={!selectedAnchor} selectedMarkerId={selectedAnchor?.id} onMarkerSelect={setSelectedAnchor} />
      <button type="button" className="absolute left-4 top-4 z-20 rounded-xl bg-white p-3 shadow" onClick={() => navigate(`/boards/${boardId}`)}>← 모임</button>
      <div className="absolute right-4 top-4 z-20 max-w-[calc(100%-5.5rem)] rounded-xl bg-white/95 px-3 py-2 text-xs shadow backdrop-blur">
        <b>{job.durationMin}분 도달권</b>
        <span className="ml-2 text-ink-2">연한 색은 참여자별 · 진한 자주색은 최종 교집합</span>
      </div>
      <section className="absolute inset-x-0 bottom-0 z-20 flex max-h-[48vh] flex-col rounded-t-3xl bg-white shadow-2xl lg:left-auto lg:right-5 lg:bottom-5 lg:w-[420px] lg:rounded-3xl">
        <div className="border-b border-line px-5 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line lg:hidden" />
          <p className="text-xs font-bold text-coral">공통 영역에서 고르기</p>
          <h1 className="mt-1 text-xl font-bold">핀을 누르면 바로 후보로 추가할 수 있어요</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {isochrones.map((area, index) => <span key={area.id} className="inline-flex items-center gap-1 text-xs text-ink-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ISOCHRONE_STYLES[index % ISOCHRONE_STYLES.length].fillColor }} />참여자 {index + 1}</span>)}
            {commonArea && <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-2"><i className="h-2.5 w-2.5 rounded-full bg-[#9D174D]" />공통 영역</span>}
          </div>
          {!commonArea && <div className="mt-3 rounded-xl bg-bg p-3 text-sm text-ink-2">이번 시간 범위에서는 공통 영역을 찾지 못했어요.{nextDuration ? <Button className="mt-2 !py-2.5" onClick={() => { setDuration(nextDuration); setJob(null); setError(""); }}>다음 시간({nextDuration}분)으로 다시 계산</Button> : <Button className="mt-2 !py-2.5" onClick={() => navigate(`/boards/${boardId}`)}>모임 지도에서 직접 장소 추가</Button>}</div>}
          {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {anchors.map((anchor, index) => <button key={anchor.id || `${anchor.lat}-${anchor.lon}`} type="button" className={`mb-2 flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${selectedAnchor?.id === anchor.id ? "border-coral bg-coral-soft" : "border-line"}`} onClick={() => setSelectedAnchor(anchor)}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-soft font-bold text-coral">{index + 1}</span><span className="min-w-0 flex-1"><b className="block truncate">{anchor.name}</b><small className="block truncate text-ink-2">{anchor.category}{anchor.roadAddress ? ` · ${anchor.roadAddress}` : ""}</small></span></button>)}
        </div>
        {selectedAnchor && <div className="border-t border-line bg-white p-4"><Button disabled={Boolean(addingAnchorId)} onClick={() => addAnchor(selectedAnchor)}>{addingAnchorId ? "추가 중…" : `“${selectedAnchor.name}” 모임 장소에 추가`}</Button></div>}
      </section>
    </main>;
  }

  return <div className="flex h-screen flex-col bg-bg">
    <header className="flex items-center gap-2.5 border-b border-line bg-white px-4 py-3"><button type="button" className="w-9 h-9 rounded-[11px] border border-line bg-white" onClick={() => navigate(`/boards/${boardId}`)}>←</button><div className="flex-1 text-center text-[15px] font-bold">동네 찾기</div><div className="w-9" /></header>
    <main className="flex-1 overflow-y-auto px-5 py-4">
      <><p className="mb-2 text-[12px] font-bold text-coral">정답이 아니라, 탐색 시작 지점이에요</p><h1 className="mb-2 text-[23px] font-bold leading-tight">어디서 만날지<br />같이 찾아볼까요?</h1><p className="mb-4 text-[13.5px] text-ink-2">함께 살펴볼 만한 동네를 보여드려요.</p>
        <div className="mb-4 space-y-2">{participants.map((participant) => <div key={participant.id} className="flex items-center gap-2.5 rounded-[13px] border border-line bg-white px-3.5 py-2.5"><Avatar label={participant.nickname} /><b className="flex-1 text-[13.5px]">{participant.nickname}</b><span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${participant.hasOrigin ? "bg-coral-soft text-coral" : "bg-[#f0efe9] text-ink-3"}`}>{participant.hasOrigin ? "출발지 등록됨" : "아직 안 함"}</span></div>)}</div>
        <div className="mb-5 flex gap-2">{[30, 45, 60].map((minutes) => <button key={minutes} type="button" disabled={running} className={`flex-1 rounded-[12px] border border-line py-3.5 text-[14px] font-bold ${duration === minutes ? "border-coral bg-coral text-white" : "bg-white text-ink-2"}`} onClick={() => setDuration(minutes)}>{minutes}분</button>)}</div>
        {error && <p className="mb-3 rounded-xl bg-white p-3 text-sm text-coral">{error}{error.includes("출발지") && <button type="button" className="ml-2 underline" onClick={() => navigate(`/boards/${boardId}/profile`)}>참여자 정보</button>}</p>}
        {running ? <section className="py-8 text-center"><div className="mx-auto mb-5 h-[66px] w-[66px] animate-spin rounded-full border-[6px] border-coral-soft border-t-coral" /><b className="block">만날 만한 지역을 찾고 있어요</b><p className="mt-1 text-xs text-ink-3">{job.status === "RETRY_WAIT" ? "외부 검색을 다시 시도하고 있어요" : "도달 영역을 계산하고 있어요"}</p><button type="button" className="mt-6 text-sm font-bold text-coral" onClick={() => { stopPolling(); setJob(null); }}>취소</button></section> : <Button onClick={requestStart}>만나기 좋은 동네 찾기</Button>}</>
    </main>
    {showExclusionConfirm && <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="area-exclusion-title">
      <section className="w-full rounded-3xl bg-white p-5 shadow-2xl sm:max-w-sm">
        <h2 id="area-exclusion-title" className="text-xl font-bold">출발지 미등록 참여자를 제외할까요?</h2>
        <p className="mt-2 text-sm text-ink-2">아래 참여자는 이번 도달 영역 계산에 포함되지 않아요.</p>
        <ul className="mt-3 rounded-2xl bg-bg p-3 text-sm">
          {participantsWithoutOrigin.map((participant) => <li key={participant.id} className="py-1 font-bold">{participant.nickname}</li>)}
        </ul>
        <Button className="mt-4" onClick={() => start(participantsWithOrigin.map((participant) => participant.id))}>제외하고 계산</Button>
        <Button variant="line" className="mt-2" onClick={() => setShowExclusionConfirm(false)}>취소</Button>
      </section>
    </div>}
  </div>;
}

function Reentry({ boardId }) { return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">다시 입장해 주세요</h1><p className="mt-2 text-ink-2">이 모임의 참여 정보를 찾을 수 없어요.</p><Button className="mt-5" onClick={() => navigate(`/boards/${boardId}`)}>모임으로</Button></div></main>; }
