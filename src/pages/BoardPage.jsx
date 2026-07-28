import { useCallback, useEffect, useRef, useState } from "react";
import { setPlaceLike } from "../api/places";
import { patchBoard } from "../api/boards";
import { getCourseDraft, putCourseDraft } from "../api/course";
import { ApiError } from "../api/errors";
import { Brand, Button } from "../components/UI";
import { AddPlacePanel } from "../components/AddPlacePanel";
import { MobileSheetHandle } from "../components/MobileSheetHandle";
import { bottomSheetMobileHeight } from "../features/bottomSheet/bottomSheetModel";
import { orderPlacesByLikes } from "../features/course/courseModel";
import { getPlaceDetailTarget } from "../features/place/placeDetailTarget";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";
import { useServerBoard } from "../store/ServerBoardContext";
import { useToast } from "../hooks/useToast";
import { useLiveLocation } from "../hooks/useLiveLocation";
import { getBoardSession } from "../api/session";
import { formatLastSeen } from "../features/liveLocation/liveLocationModel";

function messageFor(error) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "참여 정보가 만료됐어요. 다시 입장해 주세요.";
    if (error.status === 404) return "모임 정보를 찾을 수 없어요.";
    if (error.status === 409) return "모임 상태가 바뀌었어요. 최신 정보를 다시 불러와 주세요.";
    if (error.status === 429) return error.retryAfterSeconds ? `${error.retryAfterSeconds}초 뒤 다시 시도해 주세요.` : "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    if ([502, 503].includes(error.status)) return "서버가 잠시 불안정해요. 다시 시도해 주세요.";
  }
  return "모임 정보를 처리하지 못했어요. 다시 시도해 주세요.";
}

export function BoardPage({ boardId }) {
  const { status, board, places, placesPage, participants, invitation, areaMapResults, error, partialErrors, reload, loadMorePlaces } = useServerBoard();
  const [focusedId, setFocusedId] = useState(null);
  const [mutationId, setMutationId] = useState("");
  const [message, setMessage] = useState("");
  const [share, setShare] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [editingBoard, setEditingBoard] = useState(false);
  const [boardForm, setBoardForm] = useState({ name: "", purpose: "" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [areaPanelOpen, setAreaPanelOpen] = useState(false);
  const [areaVisible, setAreaVisible] = useState(false);
  const [areaDuration, setAreaDuration] = useState(null);
  const [addingPlace, setAddingPlace] = useState(false);
  const [searchLayer, setSearchLayer] = useState([]);
  const [pinMode, setPinMode] = useState(false);
  const [pickedPoint, setPickedPoint] = useState(null);
  const [searchRadius, setSearchRadius] = useState(1500);
  const [markerSelection, setMarkerSelection] = useState(null);
  const [courseDraft, setCourseDraft] = useState({ version: 0, etag: "\"draft-0\"", placeIds: [] });
  const mutationControllerRef = useRef(null);
  const moreControllerRef = useRef(null);
  const toast = useToast();
  const { sharing, locations: liveLocations, error: liveLocationError, startSharing, stopSharing } = useLiveLocation(boardId);
  const currentParticipantId = getBoardSession(boardId)?.participantId;
  const placesForList = orderPlacesByLikes(places);
  const focusedPlace = places.find((place) => place.id === focusedId)
    ?? places[0];
  const openedPlace = focusedId ? places.find((place) => place.id === focusedId) : null;
  const overlayPlace = markerSelection ?? openedPlace;
  const selectedArea = areaMapResults.find((result) => result.durationMin === areaDuration) ?? areaMapResults[0] ?? null;
  const liveMarkers = liveLocations.map((location) => ({
    ...location,
    id: `live-${location.participantId}`,
    kind: "live-location",
    isMe: location.participantId === currentParticipantId,
    lastSeen: formatLastSeen(location.updatedAt),
  }));
  const liveCircles = liveLocations
    .filter((location) => Number.isFinite(location.accuracyMeters) && location.accuracyMeters > 0)
    .map((location) => ({ ...location, radius: Math.min(location.accuracyMeters, 5000), color: location.avatarColor, fillOpacity: 0.08 }));

  const refreshCourseDraft = useCallback(async (signal) => {
    try {
      const nextDraft = await getCourseDraft(boardId, { signal });
      if (!signal?.aborted) setCourseDraft(nextDraft);
    } catch (requestError) {
      if (signal?.aborted || requestError?.isCanceled) return;
      if (requestError?.status === 401) {
        await reload(signal);
        return;
      }
      setMessage(messageFor(requestError));
    }
  }, [boardId, reload]);

  useEffect(() => () => {
    mutationControllerRef.current?.abort();
    moreControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!share) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShare(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [share]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      refreshCourseDraft(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refreshCourseDraft, status, board?.updatedAt]);

  async function mutate(id, operation) {
    if (mutationId) return;
    mutationControllerRef.current?.abort();
    const controller = new AbortController();
    mutationControllerRef.current = controller;
    setMutationId(id);
    setMessage("");
    try {
      await operation(controller.signal);
      if (controller.signal.aborted) return;
      await reload(controller.signal);
      if (controller.signal.aborted) return;
      await refreshCourseDraft(controller.signal);
    } catch (requestError) {
      if (controller.signal.aborted || requestError?.isCanceled) return;
      if (requestError?.status === 401) await reload(controller.signal);
      if (requestError?.status === 409) await reload(controller.signal);
      if (requestError?.status === 412) await refreshCourseDraft(controller.signal);
      if (!controller.signal.aborted) setMessage(messageFor(requestError));
    } finally {
      if (!controller.signal.aborted) setMutationId("");
    }
  }

  function toggleCoursePlace(placeId) {
    mutate(`course-${placeId}`, async (signal) => {
      const latest = await getCourseDraft(boardId, { signal });
      if (signal.aborted) return;
      const placeIds = latest.placeIds.includes(placeId)
        ? latest.placeIds.filter((id) => id !== placeId)
        : [...latest.placeIds, placeId];
      const saved = await putCourseDraft(boardId, placeIds, latest.etag, { signal });
      if (!signal.aborted) setCourseDraft(saved);
    });
  }

  function openPlaceDetail(place) {
    const target = getPlaceDetailTarget(boardId, place);
    if (!target) {
      setMessage("이 장소의 상세 정보 링크가 없어요.");
      return;
    }
    if (target.kind === "external") {
      window.open(target.url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(target.path);
  }

  function openBoardEditor() {
    setBoardForm({ name: board?.name ?? "", purpose: board?.purpose ?? "" });
    setEditingBoard(true);
  }

  function saveBoard() {
    const name = boardForm.name.trim();
    const purpose = boardForm.purpose.trim();
    if (name.length < 2 || name.length > 40) return setMessage("모임 이름은 2~40자로 입력해 주세요.");
    if (purpose.length > 100) return setMessage("모임 목적은 100자 이하로 입력해 주세요.");
    mutate("edit-board", async (signal) => {
      await patchBoard(boardId, { name, purpose }, { signal });
      if (!signal.aborted) setEditingBoard(false);
    });
  }

  async function loadMore() {
    moreControllerRef.current?.abort();
    const controller = new AbortController();
    moreControllerRef.current = controller;
    setLoadingMore(true);
    setMessage("");
    try {
      await loadMorePlaces(controller.signal);
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) setMessage(messageFor(requestError));
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  if (status === "reentry") return <Reentry />;
  if (status === "loading") return <main className="flex min-h-screen items-center justify-center text-ink-2">모임을 불러오는 중이에요…</main>;
  if (status === "error") return <ErrorState message={messageFor(error)} onRetry={() => reload()} />;

  const inviteUrl = invitation?.inviteUrl;
  return <main className="flex min-h-screen flex-col bg-bg">
    <header className="flex items-center justify-between border-b border-line bg-white/95 p-3 backdrop-blur">
      <span className="flex items-center gap-2"><Brand compact /><span><b className="block text-sm">{board?.name}</b><button type="button" className="text-xs text-ink-2 underline" onClick={openBoardEditor}>모임 설정</button></span></span>
      <span className="flex gap-2">
        <button type="button" onClick={() => setShare(true)} className="rounded-lg border border-line px-3 py-2">초대</button>
        <button type="button" onClick={() => navigate(`/boards/${boardId}/profile`)} className="flex -space-x-3">
          {participants.slice(0, 4).map((participant) => <span key={participant.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs text-white" style={{ backgroundColor: participant.avatarColor }}>{participant.nickname[0]}</span>)}
        </button>
      </span>
    </header>
    {editingBoard && <div className="border-b border-line bg-white p-4"><label className="text-sm font-bold">모임 이름</label><input value={boardForm.name} maxLength="40" onChange={(event) => setBoardForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-xl border border-line p-3" /><label className="mt-3 block text-sm font-bold">목적</label><input value={boardForm.purpose} maxLength="100" onChange={(event) => setBoardForm((current) => ({ ...current, purpose: event.target.value }))} className="mt-1 w-full rounded-xl border border-line p-3" /><div className="mt-3 flex gap-2"><Button disabled={Boolean(mutationId)} className="!py-3" onClick={saveBoard}>저장</Button><Button disabled={Boolean(mutationId)} variant="line" className="!py-3" onClick={() => setEditingBoard(false)}>취소</Button></div></div>}
    {share && <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 sm:place-items-center"><section role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+var(--safe-area-bottom))] sm:rounded-3xl sm:pb-5"><button type="button" aria-label="초대 창 닫기" className="float-right" onClick={() => setShare(false)}>✕</button><h2 id="share-dialog-title" className="text-xl font-bold">친구 초대하기</h2><p className="mt-3 rounded-xl bg-bg p-3 font-bold">참여 코드 {invitation?.inviteCode ?? "불러오는 중"}</p>{inviteUrl && <p className="mt-2 break-all text-sm text-ink-2">{inviteUrl}</p>}<Button className="mt-4" disabled={!inviteUrl} onClick={() => navigator.clipboard?.writeText(inviteUrl).then(() => toast("초대 링크를 복사했어요"), () => toast("링크를 복사하지 못했어요"))}>초대 링크 복사</Button></section></div>}
    <div className="relative flex-1 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="relative h-full min-h-[calc(100dvh-61px)] overflow-hidden bg-sky-soft p-5">
        <p className="relative z-10 inline-block rounded-full bg-white/90 px-3 py-2 text-sm font-bold shadow">지도에서 장소를 골라보세요</p>
        <KakaoMap className="absolute inset-0" center={focusedPlace ? { lat: focusedPlace.lat, lon: focusedPlace.lon } : undefined} markers={[...places, ...searchLayer, ...liveMarkers, ...(pickedPoint ? [{ id: "picked-point", name: "선택한 위치", ...pickedPoint }] : [])]} polygons={areaVisible && selectedArea ? [{ id: selectedArea.id, geometry: selectedArea.commonArea }] : []} circles={[...(addingPlace && pickedPoint ? [{ ...pickedPoint, radius: searchRadius }] : []), ...liveCircles]} selectedMarkerId={focusedId} placeOverlay={overlayPlace} onOverlayClose={() => { setFocusedId(null); setMarkerSelection(null); }} onOverlayDetail={openPlaceDetail} onMarkerSelect={(place) => { if (place.kind === "live-location") return; if (place.kind === "search") { setMarkerSelection(place); setFocusedId(null); } else { setFocusedId(place.id); setMarkerSelection(null); } }} onMapClick={(point) => { setMarkerSelection(null); if (addingPlace || pinMode) setPickedPoint(point); }} />
        {!addingPlace && !areaPanelOpen && <><button type="button" onClick={() => { setAddingPlace(true); setAreaPanelOpen(false); setPickedPoint(null); setSearchLayer([]); }} className="absolute bottom-[calc(36vh+1rem)] right-4 z-10 grid h-14 w-14 place-items-center rounded-[18px] bg-yellow text-2xl font-black text-navy shadow-[0_6px_0_#d4b837] lg:bottom-5 lg:right-5" aria-label="장소 추가">＋</button>
        <button type="button" onClick={() => { if (sharing) stopSharing(); else startSharing(); }} className={`absolute bottom-[calc(36vh+1rem)] right-20 z-10 rounded-xl px-3 py-3 text-xs font-black shadow lg:bottom-5 lg:right-24 ${sharing ? "bg-navy text-white" : "bg-white text-ink"}`} aria-pressed={sharing}>{sharing ? "위치 공유 중지" : "내 위치 공유"}</button>
        <button type="button" onClick={() => { setAreaPanelOpen(true); setAddingPlace(false); }} className="absolute bottom-[calc(36vh+1rem)] left-4 z-10 rounded-xl bg-white px-4 py-3 font-bold shadow lg:bottom-5 lg:left-5">🧭 공통 영역</button></>}
        {areaPanelOpen && <section className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white p-5 shadow-2xl lg:absolute lg:bottom-5 lg:left-5 lg:right-auto lg:w-80 lg:rounded-2xl"><div className="mb-3 flex items-center justify-between"><b>공통 영역</b><button type="button" onClick={() => setAreaPanelOpen(false)}>✕</button></div>{areaMapResults.length ? <><div className="flex gap-2">{areaMapResults.map((result) => <button key={result.id} type="button" onClick={() => { setAreaDuration(result.durationMin); setAreaVisible(true); }} className={`flex-1 rounded-lg p-2 text-sm font-bold ${(selectedArea?.durationMin === result.durationMin && areaVisible) ? "bg-coral text-white" : "bg-bg"}`}>{result.durationMin}분</button>)}</div><label className="mt-4 flex items-center justify-between text-sm"><span>{selectedArea?.durationMin ?? ""}분 공통 도달 영역 표시</span><input type="checkbox" checked={areaVisible} onChange={(event) => setAreaVisible(event.target.checked)} /></label></> : <><p className="text-sm text-ink-2">아직 지도에 표시할 공통 영역이 없어요.</p><Button className="mt-3 !py-3" onClick={() => navigate(`/boards/${boardId}/area`)}>동네 찾기</Button></>}</section>}
        {addingPlace && <AddPlacePanel boardId={boardId} reload={reload} pickedPoint={pickedPoint} markerSelection={markerSelection} radius={searchRadius} onRadiusChange={setSearchRadius} onLayerChange={setSearchLayer} onPickMode={setPinMode} onClose={() => { setAddingPlace(false); setSearchLayer([]); setMarkerSelection(null); setPinMode(false); setPickedPoint(null); }} />}
      </section>
      <section className={`${addingPlace ? "hidden lg:flex" : "flex"} ${bottomSheetMobileHeight(sheetExpanded, "max-h-[36dvh]")} absolute inset-x-0 bottom-0 z-20 flex-col rounded-t-3xl bg-white shadow-2xl transition-[max-height] duration-200 lg:static lg:max-h-[calc(100vh-60px)] lg:rounded-none lg:shadow-none`}>
        <MobileSheetHandle expanded={sheetExpanded} onChange={setSheetExpanded} />
        <div className="p-5"><h1 className="text-lg font-bold">가고 싶은 곳 {placesPage.totalItems || board?.counts?.places || 0}곳 <small className="text-ink-3">({places.length}개 표시)</small></h1><button type="button" className="mt-1 text-xs font-bold text-coral underline" onClick={() => navigate(`/boards/${boardId}/course`)}>코스 보기 · {courseDraft.placeIds.length}곳</button>{status === "partial-error" && <p className="mt-2 text-sm text-coral">일부 정보를 불러오지 못했어요. <button type="button" className="underline" onClick={() => reload()}>다시 시도</button></p>}{partialErrors.length > 0 && <p className="sr-only">일부 API 요청이 실패했습니다.</p>}{(message || liveLocationError) && <p className="mt-2 text-sm text-coral">{message || liveLocationError}</p>}</div>
        <div className="flex-1 overflow-auto px-4">{placesForList.length > 0 ? placesForList.map((place) => <article key={place.id} onClick={() => setFocusedId(place.id)} className={`mb-3 cursor-pointer rounded-2xl border p-3 ${focusedId === place.id ? "border-coral bg-coral-soft" : "border-line"}`}><div className="flex gap-3"><span className="text-2xl">{courseDraft.placeIds.includes(place.id) ? courseDraft.placeIds.indexOf(place.id) + 1 : place.categoryEmoji}</span><span className="flex-1"><b className="block">{place.name}</b><small className="flex items-center gap-1.5 text-ink-2"><span>{place.category} ·</span><span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: place.proposerAvatarColor }}>{place.proposerName[0]}</span><span style={{ color: place.proposerAvatarColor }}>{place.proposerName}</span></small></span></div><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={Boolean(mutationId)} onClick={(event) => { event.stopPropagation(); mutate(`like-${place.id}`, (signal) => setPlaceLike(boardId, place.id, !place.likedByMe, { signal })); }} className="rounded-lg bg-white px-2 py-1 text-xs disabled:opacity-50">🩷 {place.likeCount}</button><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/boards/${boardId}/places/${place.id}`); }} className="rounded-lg bg-white px-2 py-1 text-xs">💬 {place.commentCount}</button><button type="button" disabled={Boolean(mutationId)} onClick={(event) => { event.stopPropagation(); toggleCoursePlace(place.id); }} className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-coral disabled:opacity-50">{courseDraft.placeIds.includes(place.id) ? "코스에서 빼기" : "코스에 담기"}</button></div></article>) : <p className="rounded-2xl bg-bg p-5 text-sm text-ink-2">아직 담긴 장소가 없어요. 검색하거나 직접 핀을 찍어 첫 장소를 추가해 보세요.</p>}{placesPage.number < placesPage.totalPages && <Button variant="line" className="mb-4 !py-3" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "불러오는 중…" : "장소 더 보기"}</Button>}</div>
        <div className="p-4"><Button variant="line" onClick={() => navigate(`/boards/${boardId}/area`)}>🧭 만나기 좋은 동네 찾기</Button></div>
      </section>
    </div>
  </main>;
}

function Reentry() { return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">다시 입장해 주세요</h1><p className="mt-2 text-ink-2">이 모임의 참여 정보를 찾을 수 없어요.</p><Button className="mt-5" onClick={() => navigate("/")}>홈으로</Button></div></main>; }
function ErrorState({ message, onRetry }) { return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">모임을 열 수 없어요</h1><p className="mt-2 text-ink-2">{message}</p><Button className="mt-5" onClick={onRetry}>다시 시도</Button><Button variant="line" className="mt-2" onClick={() => navigate("/")}>홈으로</Button></div></main>; }
