import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCourseDraft, putCourseDraft } from "../api/course";
import { calculateTransitTimes, getPlace } from "../api/places";
import { Brand, Button, Mascot } from "../components/UI";
import { canHighlightTransitRoute, moveCoursePlace, removeCoursePlace } from "../features/course/courseModel";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";
import { useServerBoard } from "../store/ServerBoardContext";

const EMPTY_DRAFT = { version: 0, etag: "\"draft-0\"", placeIds: [], legs: [] };

function messageFor(error) {
  if (error?.status === 401) return "참여 정보가 만료됐어요. 다시 입장해 주세요.";
  if (error?.status === 404) return "코스의 장소 정보를 찾을 수 없어요.";
  if (error?.status === 412) return "다른 참여자가 먼저 코스를 바꿨어요.";
  if (error?.status === 429) return error.retryAfterSeconds ? `${error.retryAfterSeconds}초 뒤 다시 시도해 주세요.` : "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if ([502, 503].includes(error?.status)) return "서비스가 잠시 불안정해요. 다시 시도해 주세요.";
  return "코스를 처리하지 못했어요. 다시 시도해 주세요.";
}

function transitLabel(item) {
  if (item.status === "READY") return `약 ${item.totalMinutes}분 · 환승 ${item.transferCount}회`;
  if (item.status === "ORIGIN_REQUIRED") return "출발지 미등록";
  if (item.status === "UNAVAILABLE") return "대중교통 경로 없음";
  return "계산 실패";
}

export function CoursePage({ boardId }) {
  const { board, status: boardStatus } = useServerBoard();
  const [status, setStatus] = useState("loading");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [places, setPlaces] = useState([]);
  const [focusedPlaceId, setFocusedPlaceId] = useState(null);
  const [message, setMessage] = useState("");
  const [mutating, setMutating] = useState(false);
  const [transitTimes, setTransitTimes] = useState([]);
  const [transitLoading, setTransitLoading] = useState(false);
  const [highlightedParticipantId, setHighlightedParticipantId] = useState(null);
  const loadControllerRef = useRef(null);
  const mutationControllerRef = useRef(null);
  const transitControllerRef = useRef(null);
  const loadGenerationRef = useRef(0);
  const previousFirstPlaceIdRef = useRef(null);

  const load = useCallback(async ({ externalSignal } = {}) => {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    const generation = ++loadGenerationRef.current;
    const abortFromConsumer = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener("abort", abortFromConsumer, { once: true });
    setStatus("loading");
    setMessage("");
    try {
      const nextDraft = await getCourseDraft(boardId, { signal: controller.signal });
      const nextPlaces = await Promise.all(nextDraft.placeIds.map((placeId) => getPlace(boardId, placeId, { signal: controller.signal })));
      if (controller.signal.aborted || generation !== loadGenerationRef.current) return;
      setDraft(nextDraft);
      setPlaces(nextPlaces);
      setFocusedPlaceId((current) => nextPlaces.some((place) => place.id === current) ? current : nextPlaces[0]?.id ?? null);
      setStatus(nextPlaces.length ? "ready" : "empty");
    } catch (error) {
      if (controller.signal.aborted || error?.isCanceled) return;
      setMessage(messageFor(error));
      setStatus(error?.status === 401 ? "reentry" : "error");
    } finally {
      externalSignal?.removeEventListener("abort", abortFromConsumer);
    }
  }, [boardId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (boardStatus !== "reentry") load();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      loadControllerRef.current?.abort();
      mutationControllerRef.current?.abort();
      transitControllerRef.current?.abort();
    };
  }, [boardStatus, load]);

  const firstPlaceId = draft.placeIds[0] ?? null;
  useEffect(() => {
    if (previousFirstPlaceIdRef.current && previousFirstPlaceIdRef.current !== firstPlaceId) {
      transitControllerRef.current?.abort();
      setTransitTimes([]);
      setTransitLoading(false);
      setHighlightedParticipantId(null);
    }
    previousFirstPlaceIdRef.current = firstPlaceId;
  }, [firstPlaceId]);

  const saveDraft = async (makeNextPlaceIds) => {
    if (mutating) return;
    mutationControllerRef.current?.abort();
    const controller = new AbortController();
    mutationControllerRef.current = controller;
    setMutating(true);
    setMessage("");
    try {
      const latest = await getCourseDraft(boardId, { signal: controller.signal });
      const nextPlaceIds = makeNextPlaceIds(latest.placeIds);
      if (nextPlaceIds.join("\u0000") === latest.placeIds.join("\u0000")) return;
      await putCourseDraft(boardId, nextPlaceIds, latest.etag, { signal: controller.signal });
      if (controller.signal.aborted) return;
      await load({ externalSignal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted || error?.isCanceled) return;
      if (error?.status === 412) await load({ externalSignal: controller.signal });
      if (!controller.signal.aborted) setMessage(messageFor(error));
    } finally {
      if (!controller.signal.aborted) setMutating(false);
    }
  };

  const calculateTransit = async () => {
    if (!firstPlaceId || transitLoading) return;
    transitControllerRef.current?.abort();
    const controller = new AbortController();
    transitControllerRef.current = controller;
    setTransitLoading(true);
    setTransitTimes([]);
    setMessage("");
    try {
      const nextTransitTimes = await calculateTransitTimes(boardId, firstPlaceId, { signal: controller.signal });
      if (!controller.signal.aborted) setTransitTimes(nextTransitTimes);
    } catch (error) {
      if (!controller.signal.aborted && !error?.isCanceled) setMessage(messageFor(error));
    } finally {
      if (!controller.signal.aborted) setTransitLoading(false);
    }
  };

  const routeLines = useMemo(() => transitTimes.filter(canHighlightTransitRoute).map((item) => ({
    id: item.participantId, path: item.route.path, color: item.avatarColor,
    weight: highlightedParticipantId && highlightedParticipantId !== item.participantId ? 4 : highlightedParticipantId ? 8 : 5,
    opacity: highlightedParticipantId && highlightedParticipantId !== item.participantId ? 0.25 : 0.78,
  })), [highlightedParticipantId, transitTimes]);

  if (boardStatus === "reentry" || status === "reentry") return <Reentry />;
  if (status === "loading") return <main className="flex min-h-screen items-center justify-center bg-bg text-ink-2">코스를 불러오는 중이에요.</main>;
  if (status === "error") return <ErrorState message={message} onRetry={load} />;

  if (status === "empty") {
    return <main className="flex min-h-screen items-center justify-center bg-sky-soft px-5 text-center"><div className="max-w-sm"><Brand className="justify-center" /><Mascot className="mx-auto mt-6 h-36 w-36" /><h1 className="mt-4 text-2xl font-black">아직 코스가 없어요</h1><p className="mt-2 text-sm text-ink-2">장소를 담아 우리 모임 코스를 만들어 보세요.</p><Button className="mt-5" onClick={() => navigate(`/boards/${boardId}`)}>장소 추가하기</Button></div></main>;
  }

  const overlayPlace = places.find((place) => place.id === focusedPlaceId) ?? null;
  const focusedPlace = overlayPlace ?? places[0];
  const orderByPlaceId = new Map(draft.placeIds.map((placeId, index) => [placeId, index + 1]));
  const legByFromOrder = new Map(draft.legs.map((leg) => [leg.fromOrder, leg]));
  return <main className="flex min-h-screen flex-col bg-bg">
    <header className="flex items-center gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur"><button type="button" aria-label="모임으로 돌아가기" className="grid h-9 w-9 place-items-center rounded-xl bg-sky-soft text-lg font-black" onClick={() => navigate(`/boards/${boardId}`)}>‹</button><Brand compact /><span className="min-w-0"><b className="block truncate text-sm">{board?.name ?? "우리 모임"}</b><span className="text-xs text-ink-2">모두 함께 수정할 수 있어요</span></span></header>
    <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
      <section className="relative h-[36dvh] min-h-64 overflow-hidden bg-sky-soft lg:h-auto lg:min-h-0 lg:flex-1">
        <KakaoMap className="absolute inset-0" center={focusedPlace ? { lat: focusedPlace.lat, lon: focusedPlace.lon } : undefined} markers={places.map((place) => ({ ...place, order: orderByPlaceId.get(place.id) }))} polylines={routeLines} fitBounds={routeLines.length > 0} selectedMarkerId={focusedPlace?.id} placeOverlay={overlayPlace} onOverlayClose={() => setFocusedPlaceId(null)} onOverlayDetail={(place) => navigate(`/boards/${boardId}/places/${place.id}`)} onMarkerSelect={(place) => setFocusedPlaceId(place.id)} />
        <div className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-3 py-2 text-sm font-black shadow-sm">우리 모임 코스예요!</div>
      </section>
      <section className="mx-auto w-full max-w-3xl px-4 py-5 lg:mx-0 lg:max-h-[calc(100dvh-61px)] lg:w-[420px] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-line lg:bg-white">
      {message && <p role="alert" className="mb-3 rounded-xl bg-white p-3 text-sm text-coral lg:bg-coral-soft">{message}</p>}
      <div className="mb-4"><h1 className="text-xl font-black">우리 모임 코스예요!</h1><p className="mt-1 text-sm text-ink-2">장소 {places.length}곳 · 순서는 언제든 바꿀 수 있어요.</p></div>
      <div className="space-y-3">{places.map((place, index) => {
        const order = index + 1;
        const leg = legByFromOrder.get(order);
        return <div key={place.id}><article className={`rounded-2xl border bg-white p-4 ${focusedPlace?.id === place.id ? "border-coral bg-coral-soft" : "border-line"}`}><button type="button" className="block w-full text-left" onClick={() => setFocusedPlaceId(place.id)}><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy font-black text-white">{order}</span><span className="min-w-0 flex-1"><b className="block truncate">{place.name}</b><small className="mt-1 block truncate text-ink-2">{place.category} · {place.address || "주소 정보 없음"}</small></span></div></button><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={mutating || index === 0} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold disabled:opacity-40" onClick={() => saveDraft((ids) => moveCoursePlace(ids, place.id, -1))}>위로</button><button type="button" disabled={mutating || index === places.length - 1} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold disabled:opacity-40" onClick={() => saveDraft((ids) => moveCoursePlace(ids, place.id, 1))}>아래로</button><button type="button" className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold" onClick={() => navigate(`/boards/${boardId}/places/${place.id}`)}>상세 보기</button><button type="button" disabled={mutating} className="rounded-lg border border-coral px-2.5 py-1.5 text-xs font-bold text-coral disabled:opacity-40" onClick={() => saveDraft((ids) => removeCoursePlace(ids, place.id))}>코스에서 빼기</button></div></article>{leg && <p className="px-4 py-2 text-center text-xs text-ink-2">다음 장소까지 약 {leg.estimatedWalkMinutes ?? "?"}분 · 직선거리 {leg.straightDistanceMeters ?? "?"}m</p>}</div>;
      })}</div>
      <section className="mt-5 rounded-2xl bg-sky-soft p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">첫 만남 장소 이동시간</h2><p className="text-xs text-ink-2">카드를 누르면 해당 경로를 강조해요.</p></div><button type="button" disabled={transitLoading} className="rounded-xl bg-navy px-3 py-2 text-sm font-black text-white disabled:opacity-50" onClick={calculateTransit}>{transitLoading ? "계산 중…" : "계산하기"}</button></div>{transitTimes.length > 0 && <div className="mt-3 space-y-2">{transitTimes.map((item) => { const canHighlight = canHighlightTransitRoute(item); return <button type="button" key={item.participantId} disabled={!canHighlight} onClick={() => { if (canHighlight) setHighlightedParticipantId((current) => current === item.participantId ? null : item.participantId); }} className={`flex w-full items-center gap-2 rounded-xl bg-white p-3 text-left disabled:cursor-default ${highlightedParticipantId === item.participantId ? "ring-2 ring-navy" : ""}`}><span className="grid h-8 w-8 place-items-center rounded-[10px] text-xs font-black text-white" style={{ backgroundColor: item.avatarColor }}>{item.nickname[0]}</span><b className="min-w-0 flex-1 truncate text-sm">{item.nickname}</b><span className="text-right text-sm">{transitLabel(item)}</span></button>; })}</div>}</section>
      </section>
    </div>
  </main>;
}

function Reentry() {
  return <main className="flex min-h-screen items-center justify-center bg-bg px-5 text-center"><div><h1 className="text-2xl font-black">다시 입장해 주세요</h1><p className="mt-2 text-sm text-ink-2">이 모임의 참여 정보를 찾을 수 없어요.</p><Button className="mt-5" onClick={() => navigate("/")}>홈으로</Button></div></main>;
}

function ErrorState({ message, onRetry }) {
  return <main className="flex min-h-screen items-center justify-center bg-bg px-5 text-center"><div><h1 className="text-2xl font-black">코스를 열지 못했어요</h1><p className="mt-2 text-sm text-ink-2">{message}</p><Button className="mt-5" onClick={onRetry}>다시 시도</Button><Button variant="line" className="mt-2" onClick={() => navigate("/")}>홈으로</Button></div></main>;
}
