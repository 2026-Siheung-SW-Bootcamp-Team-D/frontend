import { useEffect, useMemo, useRef, useState } from "react";
import { createPlace, searchNearbyPlaces } from "../api/places";
import { ApiError } from "../api/errors";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";
import { useServerBoard } from "../store/ServerBoardContext";

const DEFAULT_POINT = { lat: 37.5665, lon: 126.978 };
const CATEGORIES = [
  ["RESTAURANT", "음식점"],
  ["CAFE", "카페"],
  ["CULTURE", "문화시설"],
  ["TOUR", "관광"],
  ["ACCOMMODATION", "숙소"],
  ["ACTIVITY", "놀거리"],
];

function validPoint(lat, lon) {
  const parsedLat = Number(lat);
  const parsedLon = Number(lon);
  return Number.isFinite(parsedLat) && Number.isFinite(parsedLon) && parsedLat >= -90 && parsedLat <= 90 && parsedLon >= -180 && parsedLon <= 180
    ? { lat: parsedLat, lon: parsedLon }
    : null;
}

function messageFor(error) {
  if (error instanceof ApiError) {
    if (error.status === 400) return "좌표와 검색어를 확인해 주세요.";
    if (error.status === 401) return "참여 정보가 만료됐어요. 다시 입장해 주세요.";
    if (error.status === 429) return error.retryAfterSeconds ? `${error.retryAfterSeconds}초 뒤 다시 시도해 주세요.` : "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    if ([502, 503].includes(error.status)) return "검색 서버가 잠시 불안정해요. 다시 시도해 주세요.";
  }
  return "주변 장소를 찾지 못했어요. 다시 시도해 주세요.";
}

export function NearbyPage({ boardId, initialLat, initialLon }) {
  const { status: boardStatus, reload } = useServerBoard();
  const initialPoint = useMemo(() => validPoint(initialLat, initialLon), [initialLat, initialLon]);
  const [point, setPoint] = useState(() => initialPoint ?? DEFAULT_POINT);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(initialPoint ? "" : (initialLat != null || initialLon != null ? "잘못된 좌표라 기본 위치에서 탐색해요." : ""));
  const [addingId, setAddingId] = useState("");
  const searchControllerRef = useRef(null);
  const addControllerRef = useRef(null);
  const searchGenerationRef = useRef(0);

  useEffect(() => () => {
    searchControllerRef.current?.abort();
    addControllerRef.current?.abort();
  }, []);

  async function search({ query, categoryValue }) {
    const q = query.trim();
    if ((q && categoryValue) || (!q && !categoryValue)) {
      setError("검색어 또는 카테고리 중 하나를 선택해 주세요.");
      setStatus("idle");
      return;
    }
    if (q && (q.length < 2 || q.length > 60)) {
      setError("검색어는 2~60자로 입력해 주세요.");
      setStatus("idle");
      return;
    }
    searchControllerRef.current?.abort();
    const generation = ++searchGenerationRef.current;
    const searchPoint = { ...point };
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setError("");
    setStatus("loading");
    try {
      const found = await searchNearbyPlaces(boardId, { ...searchPoint, q: q || undefined, category: categoryValue === "ACTIVITY" ? undefined : categoryValue || undefined, theme: categoryValue === "ACTIVITY" ? "ACTIVITY" : undefined }, { signal: controller.signal });
      if (controller.signal.aborted || generation !== searchGenerationRef.current) return;
      setItems(found);
      setSelectedItem(found[0] ?? null);
      setStatus(found.length ? "results" : "empty");
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) {
        if (requestError?.status === 401) await reload(controller.signal);
        setError(messageFor(requestError));
        setStatus("error");
      }
    }
  }

  function changePoint(nextPoint) {
    if (nextPoint.lat === point.lat && nextPoint.lon === point.lon) return;
    searchControllerRef.current?.abort();
    searchGenerationRef.current += 1;
    setPoint(nextPoint);
    setItems([]);
    setSelectedItem(null);
    setStatus("idle");
    setError("");
  }

  async function add(item) {
    addControllerRef.current?.abort();
    const controller = new AbortController();
    addControllerRef.current = controller;
    setAddingId(item.providerPlaceId || item.name);
    setError("");
    try {
      await createPlace(boardId, {
        name: item.name,
        category: item.category || null,
        roadAddress: item.roadAddress || null,
        jibunAddress: item.jibunAddress || null,
        location: { lat: item.lat, lon: item.lon },
        source: { sourceProvider: "KAKAO", providerPlaceId: item.providerPlaceId || null, sourceUrl: item.sourceUrl || null, inputMethod: "SEARCH_PICK" },
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      await reload(controller.signal);
      if (controller.signal.aborted) return;
      navigate(`/boards/${boardId}`);
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) {
        if (requestError?.status === 401) await reload(controller.signal);
        if (!controller.signal.aborted) setError(messageFor(requestError));
      }
    } finally {
      if (!controller.signal.aborted) setAddingId("");
    }
  }

  if (boardStatus === "reentry") return <main className="min-h-screen p-5 text-center"><h1 className="text-2xl font-bold">다시 입장해 주세요</h1><button type="button" className="mt-5 underline" onClick={() => navigate("/")}>홈으로</button></main>;
  if (boardStatus === "loading") return <main className="min-h-screen p-5">모임 정보를 불러오는 중이에요.</main>;
  if (boardStatus === "error") return <main className="min-h-screen p-5">모임을 열지 못했어요. <button type="button" className="underline" onClick={() => navigate(`/boards/${boardId}`)}>모임으로 돌아가기</button></main>;

  const mapMarkers = items.map((item, index) => ({ ...item, id: item.providerPlaceId || `nearby-${index}` }));
  const selectedId = selectedItem?.providerPlaceId || (selectedItem ? `nearby-${items.indexOf(selectedItem)}` : null);
  return <main className="relative h-screen overflow-hidden bg-[#d7e5df]">
    <KakaoMap className="absolute inset-0" center={selectedItem ?? point} markers={mapMarkers} selectedMarkerId={selectedId} onMarkerSelect={setSelectedItem} onMapClick={changePoint} />
    <button type="button" onClick={() => navigate(`/boards/${boardId}`)} className="absolute left-4 top-4 z-20 rounded-xl bg-white p-3 shadow">← 모임</button>
    <p className="absolute right-4 top-4 z-20 rounded-full bg-white/95 px-3 py-2 text-xs font-bold shadow">지도를 눌러 검색 기준 변경</p>
    <section className="absolute inset-x-0 bottom-0 z-20 flex max-h-[48vh] flex-col rounded-t-3xl bg-white shadow-2xl lg:left-auto lg:right-5 lg:bottom-5 lg:w-[420px] lg:rounded-3xl">
      <div className="border-b border-line px-4 pb-3 pt-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line lg:hidden" />
        <h1 className="font-bold">선택한 위치 주변 탐색</h1>
        <p className="text-xs text-ink-2">{point.lat.toFixed(4)}, {point.lon.toFixed(4)}</p>
        <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); search({ query: keyword, categoryValue: "" }); }}>
          <input value={keyword} onChange={(event) => { setKeyword(event.target.value); if (category) setCategory(""); }} className="min-w-0 flex-1 rounded-xl border border-line bg-white p-3" placeholder="2자 이상 키워드" />
          <button type="submit" disabled={status === "loading"} className="rounded-xl bg-navy px-4 font-bold text-white disabled:opacity-50">{status === "loading" ? "검색 중" : "검색"}</button>
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{CATEGORIES.map(([value, label]) => <button key={value} type="button" disabled={status === "loading"} onClick={() => { setCategory(value); setKeyword(""); search({ query: "", categoryValue: value }); }} className={`shrink-0 rounded-full border px-3 py-2 text-sm ${category === value ? "border-coral bg-coral-soft" : "border-line bg-white"}`}>{label}</button>)}</div>
        {error && <p className="mt-3 text-sm text-coral">{error}</p>}
        {status === "empty" && <p className="mt-3 text-sm text-ink-2">결과가 없어요. 다른 위치나 검색어를 써 보세요.</p>}
      </div>
      {status === "results" && <div className="min-h-0 flex-1 overflow-y-auto p-4">{items.map((item, index) => {
        const itemId = item.providerPlaceId || `nearby-${index}`;
        return <button key={itemId} type="button" onClick={() => setSelectedItem(item)} className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selectedId === itemId ? "border-coral bg-coral-soft" : "border-line"}`}><span>📍</span><span className="min-w-0 flex-1"><b className="block truncate">{item.name}</b><small className="block truncate text-ink-2">{item.category}</small></span></button>;
      })}</div>}
      {selectedItem && <div className="border-t border-line p-4"><button type="button" disabled={Boolean(addingId)} onClick={() => add(selectedItem)} className="w-full rounded-xl bg-coral px-4 py-3 font-bold text-white disabled:opacity-50">{addingId === (selectedItem.providerPlaceId || selectedItem.name) ? "추가 중…" : `“${selectedItem.name}” 모임 장소에 추가`}</button></div>}
    </section>
  </main>;
}
