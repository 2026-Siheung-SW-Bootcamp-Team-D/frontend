import { useContext, useState } from "react";
import { Avatar, Button } from "../components/UI";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";
import { BoardContext } from "../store/BoardContext";
import { useToast } from "../hooks/useToast";

export function BoardPage({ boardId }) {
  const { board, places, participants, comments, toggleLike, setSelectedPlace } = useContext(BoardContext);
  const [focused, setFocused] = useState(board.selectedPlaceId);
  const [share, setShare] = useState(false);
  const toast = useToast();
  const selectedPlace = places.find((place) => place.id === focused) ?? places[0];
  const mapCenter = selectedPlace ? { lat: selectedPlace.lat, lon: selectedPlace.lon } : undefined;
  const link = `${window.location.origin}${window.location.pathname}#/join/${board.inviteCode}`;

  const focus = (place) => {
    setFocused(place.id);
    setSelectedPlace(place.id);
  };

  return <main className="flex min-h-screen flex-col bg-bg">
    <header className="flex items-center justify-between border-b border-line bg-white p-3">
      <b>{board.name}</b>
      <span className="flex gap-2">
        <button type="button" onClick={() => setShare(true)} className="rounded-lg border border-line px-3 py-2">초대</button>
        <button type="button" onClick={() => navigate(`/boards/${boardId}/profile`)} className="flex -space-x-4">
          {participants.slice(0, 4).map((participant) => <Avatar key={participant.id} emoji={participant.avatar} color={participant.color} />)}
        </button>
      </span>
    </header>
    {share && <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 sm:place-items-center">
      <section className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <button type="button" className="float-right" onClick={() => setShare(false)}>✕</button>
        <h2 className="text-xl font-bold">친구 초대하기</h2>
        <p className="mt-3 rounded-xl bg-bg p-3 font-bold">참여 코드 {board.inviteCode}</p>
        <p className="mt-2 break-all text-sm text-ink-2">{link}</p>
        <Button className="mt-4" onClick={() => navigator.clipboard?.writeText(link).then(() => toast("초대 링크를 복사했어요"), () => toast("링크를 복사하지 못했어요"))}>초대 링크 복사</Button>
      </section>
    </div>}
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="relative min-h-[360px] overflow-hidden bg-[#d7e5df] p-5">
        <p className="relative z-10 inline-block rounded-full bg-white/90 px-3 py-2 text-sm font-bold shadow">
          {board.selectedPlaceId ? `지금 함께 보는 곳 · ${places.find((place) => place.id === board.selectedPlaceId)?.name}` : "지도에서 장소를 골라보세요"}
        </p>
        <KakaoMap
          className="absolute inset-0"
          center={mapCenter}
          markers={places}
          selectedMarkerId={focused}
          onMarkerSelect={focus}
        />
        <button type="button" onClick={() => navigate(`/boards/${boardId}/add`)} className="absolute bottom-5 right-5 z-10 rounded-xl bg-coral px-4 py-3 font-bold text-white">＋ 장소 추가</button>
      </section>
      <section className="flex max-h-[calc(100vh-60px)] flex-col bg-white">
        <div className="p-5">
          <h1 className="text-lg font-bold">가고 싶은 곳 {places.length}곳</h1>
          {board.lastSelectionChange && <p className="mt-1 text-xs text-ink-2">{board.lastSelectionChange.by}님이 방금 전 현재 선택을 {board.lastSelectionChange.type}했어요.</p>}
        </div>
        <div className="flex-1 overflow-auto px-4">
          {places.length > 0 ? places.map((place) => <article key={place.id} onClick={() => focus(place)} className={`mb-3 cursor-pointer rounded-2xl border p-3 ${focused === place.id ? "border-coral bg-coral-soft" : "border-line"}`}>
            <div className="flex gap-3"><span className="text-2xl">{place.categoryEmoji}</span><span className="flex-1"><b className="block">{place.name}</b><small className="text-ink-2">{place.category} · {place.proposerName}</small></span></div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={(event) => { event.stopPropagation(); toggleLike(place.id); }} className="rounded-lg bg-white px-2 py-1 text-xs">🩷 {place.likeCount}</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/boards/${boardId}/places/${place.id}`); }} className="rounded-lg bg-white px-2 py-1 text-xs">💬 {comments[place.id]?.length || 0}</button>
            </div>
          </article>) : <p className="rounded-2xl bg-bg p-5 text-sm text-ink-2">아직 담긴 장소가 없어요. 검색하거나 직접 핀을 찍어 첫 장소를 추가해 보세요.</p>}
        </div>
        <div className="p-4"><Button variant="navy" onClick={() => navigate(`/boards/${boardId}/area`)}>🧭 만나기 좋은 동네 찾기</Button></div>
      </section>
    </div>
  </main>;
}
