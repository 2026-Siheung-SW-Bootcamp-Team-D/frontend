import { useState } from "react";
import { clearSelectedPlace, selectPlace, setPlaceLike } from "../api/places";
import { ApiError } from "../api/errors";
import { Button } from "../components/UI";
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
  const { status, board, places, participants, invitation, error, partialErrors, reload } = useServerBoard();
  const [focusedId, setFocusedId] = useState(null);
  const [mutationId, setMutationId] = useState("");
  const [message, setMessage] = useState("");
  const [share, setShare] = useState(false);
  const toast = useToast();
  const focusedPlace = places.find((place) => place.id === focusedId)
    ?? places.find((place) => place.id === board?.selectedPlaceId)
    ?? places[0];

  async function mutate(id, operation) {
    setMutationId(id);
    setMessage("");
    try {
      await operation();
      await reload();
    } catch (requestError) {
      if (requestError?.status === 409) await reload();
      setMessage(messageFor(requestError));
    } finally {
      setMutationId("");
    }
  }

  if (status === "reentry") return <Reentry />;
  if (status === "loading") return <main className="flex min-h-screen items-center justify-center text-ink-2">모임을 불러오는 중이에요…</main>;
  if (status === "error") return <ErrorState message={messageFor(error)} onRetry={() => reload()} />;

  const inviteUrl = invitation?.inviteUrl;
  return <main className="flex min-h-screen flex-col bg-bg">
    <header className="flex items-center justify-between border-b border-line bg-white p-3">
      <b>{board?.name}</b>
      <span className="flex gap-2">
        <button type="button" onClick={() => setShare(true)} className="rounded-lg border border-line px-3 py-2">초대</button>
        <button type="button" onClick={() => navigate(`/boards/${boardId}/profile`)} className="flex -space-x-3">
          {participants.slice(0, 4).map((participant) => <span key={participant.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs text-white" style={{ backgroundColor: participant.avatarColor }}>{participant.nickname[0]}</span>)}
        </button>
      </span>
    </header>
    {share && <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 sm:place-items-center"><section className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl"><button type="button" className="float-right" onClick={() => setShare(false)}>✕</button><h2 className="text-xl font-bold">친구 초대하기</h2><p className="mt-3 rounded-xl bg-bg p-3 font-bold">참여 코드 {invitation?.inviteCode ?? "불러오는 중"}</p>{inviteUrl && <p className="mt-2 break-all text-sm text-ink-2">{inviteUrl}</p>}<Button className="mt-4" disabled={!inviteUrl} onClick={() => navigator.clipboard?.writeText(inviteUrl).then(() => toast("초대 링크를 복사했어요"), () => toast("링크를 복사하지 못했어요"))}>초대 링크 복사</Button></section></div>}
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="relative min-h-[360px] overflow-hidden bg-[#d7e5df] p-5">
        <p className="relative z-10 inline-block rounded-full bg-white/90 px-3 py-2 text-sm font-bold shadow">{board?.selectedPlaceId ? `지금 함께 보는 곳 · ${places.find((place) => place.id === board.selectedPlaceId)?.name ?? "장소"}` : "지도에서 장소를 골라보세요"}</p>
        <KakaoMap className="absolute inset-0" center={focusedPlace ? { lat: focusedPlace.lat, lon: focusedPlace.lon } : undefined} markers={places} selectedMarkerId={focusedId ?? board?.selectedPlaceId} onMarkerSelect={(place) => setFocusedId(place.id)} />
        <button type="button" onClick={() => navigate(`/boards/${boardId}/add`)} className="absolute bottom-5 right-5 z-10 rounded-xl bg-coral px-4 py-3 font-bold text-white">＋ 장소 추가</button>
      </section>
      <section className="flex max-h-[calc(100vh-60px)] flex-col bg-white">
        <div className="p-5"><h1 className="text-lg font-bold">가고 싶은 곳 {places.length}곳</h1>{status === "partial-error" && <p className="mt-2 text-sm text-coral">일부 정보를 불러오지 못했어요. <button type="button" className="underline" onClick={() => reload()}>다시 시도</button></p>}{partialErrors.length > 0 && <p className="sr-only">일부 API 요청이 실패했습니다.</p>}{message && <p className="mt-2 text-sm text-coral">{message}</p>}</div>
        <div className="flex-1 overflow-auto px-4">{places.length > 0 ? places.map((place) => <article key={place.id} onClick={() => setFocusedId(place.id)} className={`mb-3 cursor-pointer rounded-2xl border p-3 ${(focusedId ?? board?.selectedPlaceId) === place.id ? "border-coral bg-coral-soft" : "border-line"}`}><div className="flex gap-3"><span className="text-2xl">{place.categoryEmoji}</span><span className="flex-1"><b className="block">{place.name}</b><small className="text-ink-2">{place.category} · {place.proposerName}</small></span></div><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={Boolean(mutationId)} onClick={(event) => { event.stopPropagation(); mutate(`like-${place.id}`, () => setPlaceLike(boardId, place.id, !place.likedByMe)); }} className="rounded-lg bg-white px-2 py-1 text-xs disabled:opacity-50">🩷 {place.likeCount}</button><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/boards/${boardId}/places/${place.id}`); }} className="rounded-lg bg-white px-2 py-1 text-xs">💬 {place.commentCount}</button>{board?.selectedPlaceId === place.id ? <button type="button" disabled={Boolean(mutationId)} onClick={(event) => { event.stopPropagation(); mutate("clear-selection", () => clearSelectedPlace(boardId)); }} className="rounded-lg bg-white px-2 py-1 text-xs disabled:opacity-50">현재 선택 해제</button> : <button type="button" disabled={Boolean(mutationId)} onClick={(event) => { event.stopPropagation(); mutate(`select-${place.id}`, () => selectPlace(boardId, place.id)); }} className="rounded-lg bg-white px-2 py-1 text-xs disabled:opacity-50">현재 선택</button>}</div></article>) : <p className="rounded-2xl bg-bg p-5 text-sm text-ink-2">아직 담긴 장소가 없어요. 검색하거나 직접 핀을 찍어 첫 장소를 추가해 보세요.</p>}</div>
        <div className="p-4"><Button variant="line" onClick={() => navigate(`/boards/${boardId}/area`)}>🧭 만나기 좋은 동네 찾기</Button></div>
      </section>
    </div>
  </main>;
}

function Reentry() { return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">다시 입장해 주세요</h1><p className="mt-2 text-ink-2">이 모임의 참여 정보를 찾을 수 없어요.</p><Button className="mt-5" onClick={() => navigate("/")}>홈으로</Button></div></main>; }
function ErrorState({ message, onRetry }) { return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">모임을 열 수 없어요</h1><p className="mt-2 text-ink-2">{message}</p><Button className="mt-5" onClick={onRetry}>다시 시도</Button><Button variant="line" className="mt-2" onClick={() => navigate("/")}>홈으로</Button></div></main>; }
