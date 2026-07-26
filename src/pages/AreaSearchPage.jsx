import { useEffect, useRef, useState } from "react";
import { createAreaSearchJob, getAreaSearchJob } from "../api/areaSearch";
import { ApiError } from "../api/errors";
import { Avatar, Button } from "../components/UI";
import { navigate } from "../router/router";
import { useServerBoard } from "../store/ServerBoardContext";

const MAX_POLLS = 30;
const POLL_DELAY_MS = 1500;
const ACTIVE_STATUSES = new Set(["QUEUED", "RUNNING", "RETRY_WAIT"]);

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
        setAnchors(response.anchors);
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

  async function start() {
    stopPolling();
    setError("");
    setAnchors([]);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await createAreaSearchJob(boardId, duration, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setJob(response.job);
      if (response.job.status === "SUCCEEDED") setAnchors(response.anchors);
      else if (ACTIVE_STATUSES.has(response.job.status)) poll(response.job.id);
      else setError("탐색 작업을 시작하지 못했어요. 다시 시도해 주세요.");
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) {
        if (requestError?.status === 401) await reload(controller.signal);
        if (!controller.signal.aborted) setError(messageFor(requestError));
      }
    }
  }

  if (boardStatus === "reentry") return <Reentry boardId={boardId} />;
  if (boardStatus === "loading") return <main className="min-h-screen p-5">모임 정보를 불러오는 중이에요.</main>;
  if (boardStatus === "error") return <main className="min-h-screen p-5">모임을 열지 못했어요. <button type="button" className="underline" onClick={() => navigate(`/boards/${boardId}`)}>모임으로 돌아가기</button></main>;

  const running = ACTIVE_STATUSES.has(job?.status);
  const finished = job?.status === "SUCCEEDED";
  return <div className="flex h-screen flex-col bg-bg">
    <header className="flex items-center gap-2.5 border-b border-line bg-white px-4 py-3"><button type="button" className="w-9 h-9 rounded-[11px] border border-line bg-white" onClick={() => navigate(`/boards/${boardId}`)}>←</button><div className="flex-1 text-center text-[15px] font-bold">동네 찾기</div><div className="w-9" /></header>
    <main className="flex-1 overflow-y-auto px-5 py-4">
      {!finished ? <><p className="mb-2 text-[12px] font-bold text-coral">정답이 아니라, 탐색 시작 지점이에요</p><h1 className="mb-2 text-[23px] font-bold leading-tight">어디서 만날지<br />같이 찾아볼까요?</h1><p className="mb-4 text-[13.5px] text-ink-2">함께 살펴볼 만한 동네를 보여드려요.</p>
        <div className="mb-4 space-y-2">{participants.map((participant) => <div key={participant.id} className="flex items-center gap-2.5 rounded-[13px] border border-line bg-white px-3.5 py-2.5"><Avatar label={participant.nickname} /><b className="flex-1 text-[13.5px]">{participant.nickname}</b><span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${participant.hasOrigin ? "bg-coral-soft text-coral" : "bg-[#f0efe9] text-ink-3"}`}>{participant.hasOrigin ? "출발지 등록됨" : "아직 안 함"}</span></div>)}</div>
        <div className="mb-5 flex gap-2">{[30, 45, 60].map((minutes) => <button key={minutes} type="button" disabled={running} className={`flex-1 rounded-[12px] border border-line py-3.5 text-[14px] font-bold ${duration === minutes ? "border-coral bg-coral text-white" : "bg-white text-ink-2"}`} onClick={() => setDuration(minutes)}>{minutes}분</button>)}</div>
        {error && <p className="mb-3 rounded-xl bg-white p-3 text-sm text-coral">{error}{error.includes("출발지") && <button type="button" className="ml-2 underline" onClick={() => navigate(`/boards/${boardId}/profile`)}>참여자 정보</button>}</p>}
        {running ? <section className="py-8 text-center"><div className="mx-auto mb-5 h-[66px] w-[66px] animate-spin rounded-full border-[6px] border-coral-soft border-t-coral" /><b className="block">만날 만한 지역을 찾고 있어요</b><p className="mt-1 text-xs text-ink-3">{job.status === "RETRY_WAIT" ? "외부 검색을 다시 시도하고 있어요" : "도달 영역을 계산하고 있어요"}</p><button type="button" className="mt-6 text-sm font-bold text-coral" onClick={() => { stopPolling(); setJob(null); }}>취소</button></section> : <Button onClick={start}>만나기 좋은 동네 찾기</Button>}</> : <section><p className="mb-2 text-[12px] font-bold text-coral">탐색 시작 지점을 찾았어요</p><h1 className="mb-5 text-[23px] font-bold leading-tight">여기부터<br />주변을 둘러볼까요?</h1>{anchors.length ? <div className="space-y-2.5">{anchors.map((anchor, index) => <button key={anchor.id || `${anchor.lat}-${anchor.lon}`} type="button" className="flex w-full items-center gap-3 rounded-[16px] border border-line bg-white p-3.5 text-left" onClick={() => navigate(`/boards/${boardId}/nearby?lat=${encodeURIComponent(anchor.lat)}&lon=${encodeURIComponent(anchor.lon)}`)}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-soft font-bold text-coral">{index + 1}</span><span><b className="block text-[14px]">{anchor.name}</b><span className="block text-[11.5px] text-ink-2">{anchor.category}{anchor.roadAddress ? ` · ${anchor.roadAddress}` : ""}</span></span></button>)}</div> : <div className="rounded-xl bg-white p-4 text-sm text-ink-2">공통으로 추천할 기준점을 찾지 못했어요. 지도를 직접 움직여 주변을 탐색해 보세요.<Button variant="line" className="mt-3 !py-3" onClick={() => navigate(`/boards/${boardId}/nearby`)}>자유 지도 탐색</Button></div>}</section>}
    </main>
  </div>;
}

function Reentry({ boardId }) { return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">다시 입장해 주세요</h1><p className="mt-2 text-ink-2">이 모임의 참여 정보를 찾을 수 없어요.</p><Button className="mt-5" onClick={() => navigate(`/boards/${boardId}`)}>모임으로</Button></div></main>; }
