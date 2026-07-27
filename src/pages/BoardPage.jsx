import { useEffect, useRef, useState } from "react";
import { clearSelectedPlace, selectPlace, setPlaceLike } from "../api/places";
import { patchBoard } from "../api/boards";
import { getCourseDraft, putCourseDraft } from "../api/course";
import { ApiError } from "../api/errors";
import { Button } from "../components/UI";
import { AddPlacePanel } from "../components/AddPlacePanel";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";
import { useServerBoard } from "../store/ServerBoardContext";
import { useToast } from "../hooks/useToast";

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
  const focusedPlace = places.find((place) => place.id === focusedId)
    ?? places.find((place) => place.id === board?.selectedPlaceId)
    ?? places[0];
  const openedPlace = focusedId ? places.find((place) => place.id === focusedId) : null;
  const selectedArea = areaMapResults.find((result) => result.durationMin === areaDuration) ?? areaMapResults[0] ?? null;
  const selectionActor = participants.find((participant) => participant.id === board?.selectedByParticipantId);
  const selectionMeta = board?.selectedAt ? `${selectionActor?.nickname ?? "참여자"}님이 ${new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(board.selectedAt))}에 선택` : "";

  useEffect(() => () => {
    mutationControllerRef.current?.abort();
    moreControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getCourseDraft(boardId, { signal: controller.signal })
      .then((draft) => { if (!controller.signal.aborted) setCourseDraft(draft); })
      .catch((requestError) => {
        if (!controller.signal.aborted && !requestError?.isCanceled) setMessage(messageFor(requestError));
      });
    return () => controller.abort();
  }, [boardId]);

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
    } catch (requestError) {
      if (controller.signal.aborted || requestError?.isCanceled) return;
      if (requestError?.status === 401) await reload(controller.signal);
      if (requestError?.status === 409) await reload(controller.signal);
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
    <header className="flex items-center justify-between border-b border-line bg-white p-3">
      <span><b>{board?.name}</b><button type="button" className="ml-2 text-xs text-ink-2 underline" onClick={openBoardEditor}>수정</button></span>
      <span className="flex gap-2">
        <button type="button" onClick={() => setShare(true)} className="rounded-lg border border-line px-3 py-2">초대</button>
        <button type="button" onClick={() => navigate(`/boards/${boardId}/profile`)} className="flex -space-x-3">
          {participants.slice(0, 4).map((participant) => <span key={participant.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs text-white" style={{ backgroundColor: participant.avatarColor }}>{participant.nickname[0]}</span>)}
        </button>
      </span>
    </header>
    {editingBoard && <div className="border-b border-line bg-white p-4"><label className="text-sm font-bold">모임 이름</label><input value={boardForm.name} maxLength="40" onChange={(event) => setBoardForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-xl border border-line p-3" /><label className="mt-3 block text-sm font-bold">목적</label><input value={boardForm.purpose} maxLength="100" onChange={(event) => setBoardForm((current) => ({ ...current, purpose: event.target.value }))} className="mt-1 w-full rounded-xl border border-line p-3" /><div className="mt-3 flex gap-2"><Button disabled={Boolean(mutationId)} className="!py-3" onClick={saveBoard}>저장</Button><Button disabled={Boolean(mutationId)} variant="line" className="!py-3" onClick={() => setEditingBoard(false)}>취소</Button></div></div>}
    {share && <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 sm:place-items-center"><section className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl"><button type="button" className="float-right" onClick={() => setShare(false)}>✕</button><h2 className="text-xl font-bold">친구 초대하기</h2><p className="mt-3 rounded-xl bg-bg p-3 font-bold">참여 코드 {invitation?.inviteCode ?? "불러오는 중"}</p>{inviteUrl && <p className="mt-2 break-all text-sm text-ink-2">{inviteUrl}</p>}<Button className="mt-4" disabled={!inviteUrl} onClick={() => navigator.clipboard?.writeText(inviteUrl).then(() => toast("초대 링크를 복사했어요"), () => toast("링크를 복사하지 못했어요"))}>초대 링크 복사</Button></section></div>}
    <div className="relative flex-1 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="relative h-full min-h-[calc(100vh-61px)] overflow-hidden bg-[#d7e5df] p-5">
        <p className="relative z-10 inline-block rounded-full bg-white/90 px-3 py-2 text-sm font-bold shadow">
          {board?.selectedPlaceId ? <>
            <span>지금 함께 보는 곳 · {places.find((place) => place.id === board.selectedPlaceId)?.name ?? "장소"}</span>
            {selectionMeta && <small className="ml-2 text-ink-2">{selectionMeta}</small>}
          </> : "지도에서 장소를 골라보세요"}
        </p>
        <KakaoMap className="absolute inset-0" center={focusedPlace ? { lat: focusedPlace.lat, lon: focusedPlace.lon } : undefined} markers={[...places, ...searchLayer, ...(pickedPoint ? [{ id: "picked-point", name: "선택한 위치", ...pickedPoint }] : [])]} polygons={areaVisible && selectedArea ? [{ id: selectedArea.id, geometry: selectedArea.commonArea }] : []} circles={addingPlace && pickedPoint ? [{ ...pickedPoint, radius: searchRadius }] : []} selectedMarkerId={focusedId ?? board?.selectedPlaceId} onMarkerSelect={(place) => { if (place.kind === "search") setMarkerSelection(place); else setFocusedId(place.id); }} onMapClick={(point) => { if (addingPlace || pinMode) setPickedPoint(point); }} />
        {openedPlace && !addingPlace && <section className="absolute left-4 right-4 top-20 z-20 rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur sm:left-1/2 sm:right-auto sm:w-80 sm:-translate-x-1/2">
          <button type="button" aria-label="장소 정보 닫기" onClick={() => setFocusedId(null)} className="float-right rounded-full bg-bg px-2 py-1">✕</button>
          <p className="text-xs font-bold text-coral">{openedPlace.category}</p>
          <h2 className="mt-1 pr-8 text-lg font-bold">{openedPlace.name}</h2>
          <p className="mt-1 text-sm text-ink-2">{openedPlace.address || "주소 정보가 없어요."}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: openedPlace.proposerAvatarColor }}>{openedPlace.proposerName[0]}</span>
            <small className="text-ink-2">{openedPlace.proposerName}님이 추가 · 🩷 {openedPlace.likeCount} · 💬 {openedPlace.commentCount}</small>
          </div>
          <Button className="mt-3 !py-2.5" onClick={() => navigate(`/boards/${boardId}/places/${openedPlace.id}`)}>상세 정보 보기</Button>
        </section>}
        {!addingPlace && !areaPanelOpen && <><button type="button" onClick={() => { setAddingPlace(true); setAreaPanelOpen(false); setPickedPoint(null); setSearchLayer([]); }} className="absolute bottom-[calc(36vh+1rem)] right-4 z-10 rounded-xl bg-coral px-4 py-3 font-bold text-white shadow lg:bottom-5 lg:right-5">＋ 장소 추가</button>
        <button type="button" onClick={() => { setAreaPanelOpen(true); setAddingPlace(false); }} className="absolute bottom-[calc(36vh+1rem)] left-4 z-10 rounded-xl bg-white px-4 py-3 font-bold shadow lg:bottom-5 lg:left-5">🧭 공통 영역</button></>}
        {areaPanelOpen && <section className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white p-5 shadow-2xl lg:absolute lg:bottom-5 lg:left-5 lg:right-auto lg:w-80 lg:rounded-2xl"><div className="mb-3 flex items-center justify-between"><b>공통 영역</b><button type="button" onClick={() => setAreaPanelOpen(false)}>✕</button></div>{areaMapResults.length ? <><div className="flex gap-2">{areaMapResults.map((result) => <button key={result.id} type="button" onClick={() => { setAreaDuration(result.durationMin); setAreaVisible(true); }} className={`flex-1 rounded-lg p-2 text-sm font-bold ${(selectedArea?.durationMin === result.durationMin && areaVisible) ? "bg-coral text-white" : "bg-bg"}`}>{result.durationMin}분</button>)}</div><label className="mt-4 flex items-center justify-between text-sm"><span>{selectedArea?.durationMin ?? ""}분 공통 도달 영역 표시</span><input type="checkbox" checked={areaVisible} onChange={(event) => setAreaVisible(event.target.checked)} /></label></> : <><p className="text-sm text-ink-2">아직 지도에 표시할 공통 영역이 없어요.</p><Button className="mt-3 !py-3" onClick={() => navigate(`/boards/${boardId}/area`)}>동네 찾기</Button></>}</section>}
        {addingPlace && <AddPlacePanel boardId={boardId} reload={reload} pickedPoint={pickedPoint} markerSelection={markerSelection} radius={searchRadius} onRadiusChange={setSearchRadius} onLayerChange={setSearchLayer} onPickMode={setPinMode} onClose={() => { setAddingPlace(false); setSearchLayer([]); setMarkerSelection(null); setPinMode(false); setPickedPoint(null); }} />}
      </section>
      <section className={`${addingPlace ? "hidden lg:flex" : "flex"} absolute inset-x-0 bottom-0 z-20 max-h-[36vh] flex-col rounded-t-3xl bg-white shadow-2xl lg:static lg:max-h-[calc(100vh-60px)] lg:rounded-none lg:shadow-none`}>
        <div className="p-5"><h1 className="text-lg font-bold">가고 싶은 곳 {placesPage.totalItems || board?.counts?.places || 0}곳 <small className="text-ink-3">({places.length}개 표시)</small></h1><p className="mt-1 text-xs font-bold text-coral">코스 초안 {courseDraft.placeIds.length}곳</p>{status === "partial-error" && <p className="mt-2 text-sm text-coral">일부 정보를 불러오지 못했어요. <button type="button" className="underline" onClick={() => reload()}>다시 시도</button></p>}{partialErrors.length > 0 && <p className="sr-only">일부 API 요청이 실패했습니다.</p>}{message && <p className="mt-2 text-sm text-coral">{message}</p>}</div>
        <div className="flex-1 overflow-auto px-4">{places.length > 0 ? places.map((place) => <article key={place.id} onClick={() => setFocusedId(place.id)} className={`mb-3 cursor-pointer rounded-2xl border p-3 ${(focusedId ?? board?.selectedPlaceId) === place.id ? "border-coral bg-coral-soft" : "border-line"}`}><div className="flex gap-3"><span className="text-2xl">{courseDraft.placeIds.includes(place.id) ? courseDraft.placeIds.indexOf(place.id) + 1 : place.categoryEmoji}</span><span className="flex-1"><b className="block">{place.name}</b><small className="flex items-center gap-1.5 text-ink-2"><span>{place.category} ·</span><span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: place.proposerAvatarColor }}>{place.proposerName[0]}</span><span style={{ color: place.proposerAvatarColor }}>{place.proposerName}</span></small></span></div><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={Boolean(mutationId)} onClick={(event) => { event.stopPropagation(); mutate(`like-${place.id}`, (signal) => setPlaceLike(boardId, place.id, !place.likedByMe, { signal })); }} className="rounded-lg bg-white px-2 py-1 text-xs disabled:opacity-50">🩷 {place.likeCount}</button><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/boards/${boardId}/places/${place.id}`); }} className="rounded-lg bg-white px-2 py-1 text-xs">💬 {place.commentCount}</button><button type="button" disabled={Boolean(mutationId)} onClick={(event) => { event.stopPropagation(); toggleCoursePlace(place.id); }} className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-coral disabled:opacity-50">{courseDraft.placeIds.includes(place.id) ? "코스에서 빼기" : "코스에 담기"}</button>{board?.selectedPlaceId === place.id ? <button type="button" disabled={Boolean(mutationId)} onClick={(event) => { event.stopPropagation(); mutate("clear-selection", (signal) => clearSelectedPlace(boardId, { signal })); }} className="rounded-lg bg-white px-2 py-1 text-xs disabled:opacity-50">현재 선택 해제</button> : <button type="button" disabled={Boolean(mutationId)} onClick={(event) => { event.stopPropagation(); mutate(`select-${place.id}`, (signal) => selectPlace(boardId, place.id, { signal })); }} className="rounded-lg bg-white px-2 py-1 text-xs disabled:opacity-50">현재 선택</button>}</div></article>) : <p className="rounded-2xl bg-bg p-5 text-sm text-ink-2">아직 담긴 장소가 없어요. 검색하거나 직접 핀을 찍어 첫 장소를 추가해 보세요.</p>}{placesPage.number < placesPage.totalPages && <Button variant="line" className="mb-4 !py-3" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "불러오는 중…" : "장소 더 보기"}</Button>}</div>
        <div className="p-4"><Button variant="line" onClick={() => navigate(`/boards/${boardId}/area`)}>🧭 만나기 좋은 동네 찾기</Button></div>
      </section>
    </div>
  </main>;
}

function Reentry() { return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">다시 입장해 주세요</h1><p className="mt-2 text-ink-2">이 모임의 참여 정보를 찾을 수 없어요.</p><Button className="mt-5" onClick={() => navigate("/")}>홈으로</Button></div></main>; }
function ErrorState({ message, onRetry }) { return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">모임을 열 수 없어요</h1><p className="mt-2 text-ink-2">{message}</p><Button className="mt-5" onClick={onRetry}>다시 시도</Button><Button variant="line" className="mt-2" onClick={() => navigate("/")}>홈으로</Button></div></main>; }
