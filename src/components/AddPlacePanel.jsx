import { useEffect, useRef, useState } from "react";
import { createPlace, reverseGeocode, searchNearbyPlaces, searchPlaces } from "../api/places";
import { Button } from "./UI";

function message(error) { return error?.status === 409 ? "모임 상태가 바뀌었어요. 다시 확인해 주세요." : "장소를 처리하지 못했어요. 다시 시도해 주세요."; }

export function AddPlacePanel({ boardId, reload, onClose, onLayerChange, pickedPoint, markerSelection, radius, onRadiusChange, onPickMode }) {
  const [mode, setMode] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [layerVisible, setLayerVisible] = useState(true);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState(null);
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef(null);

  useEffect(() => () => { controllerRef.current?.abort(); onLayerChange([]); onPickMode(false); }, [onLayerChange, onPickMode]);
  useEffect(() => {
    if (!pickedPoint) return;
    const controller = new AbortController(); controllerRef.current?.abort(); controllerRef.current = controller;
    reverseGeocode(boardId, pickedPoint, { signal: controller.signal }).then((address) => {
      if (!controller.signal.aborted) setManualAddress(address.roadAddress || address.jibunAddress || address.label);
    }).catch(() => {});
  }, [boardId, pickedPoint]);

  async function search(event) {
    event.preventDefault();
    const value = query.trim(); if (value.length < 2 || value.length > 60) return setError("검색어는 2~60자로 입력해 주세요.");
    const controller = new AbortController(); controllerRef.current?.abort(); controllerRef.current = controller;
    setBusy(true); setError("");
    try {
      const next = nearbyOnly && pickedPoint
        ? await searchNearbyPlaces(boardId, category ? { ...pickedPoint, category, radius } : { ...pickedPoint, q: value, radius }, { signal: controller.signal })
        : await searchPlaces(boardId, value, {}, { signal: controller.signal });
      if (!controller.signal.aborted) { setResults(next); setSelected(next[0] ?? null); setLayerVisible(true); onLayerChange(next.map((item, index) => ({ ...item, id: `search-${item.providerPlaceId || index}`, kind: "search" }))); }
    }
    catch (requestError) { if (!controller.signal.aborted) setError(message(requestError)); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function save(place) {
    if (!place || busy) return; const controller = new AbortController(); controllerRef.current?.abort(); controllerRef.current = controller; setBusy(true); setError("");
    try { await createPlace(boardId, { name: place.name, category: place.category || "직접 지정", roadAddress: place.roadAddress || null, jibunAddress: place.jibunAddress || null, location: { lat: place.lat, lon: place.lon }, source: { sourceProvider: place.sourceProvider || "KAKAO", providerPlaceId: place.providerPlaceId || null, sourceUrl: place.sourceUrl || null, inputMethod: place.inputMethod || "SEARCH_PICK" } }, { signal: controller.signal }); await reload(controller.signal); if (!controller.signal.aborted) onClose(); }
    catch (requestError) { if (!controller.signal.aborted) setError(message(requestError)); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const pick = (item) => { setSelected(item); onLayerChange([{ ...item, id: "search-selected", kind: "search" }]); };
  const activeSelection = markerSelection ?? selected;
  return <section className="absolute inset-x-0 bottom-0 z-30 max-h-[78%] overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl lg:inset-y-0 lg:left-auto lg:w-[420px] lg:max-h-none lg:rounded-none">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold tracking-wide text-coral">PLACE LAYER</p><h2 className="text-xl font-bold">장소 추가</h2></div><button type="button" onClick={onClose} className="rounded-full bg-bg px-3 py-2">✕</button></div>
    <div className="mb-4 flex rounded-xl bg-bg p-1"><button type="button" onClick={() => { setMode("search"); onPickMode(false); }} className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === "search" ? "bg-white shadow" : "text-ink-2"}`}>검색</button><button type="button" onClick={() => { setMode("pin"); onPickMode(true); onLayerChange([]); }} className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === "pin" ? "bg-white shadow" : "text-ink-2"}`}>직접 핀</button></div>
    {error && <p className="mb-3 rounded-xl bg-coral-soft p-3 text-sm text-coral">{error}</p>}
    {mode === "search" ? <><form onSubmit={search} className="flex gap-2"><input autoFocus disabled={Boolean(category)} value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-line p-3" placeholder={category ? "카테고리 검색" : "장소명 또는 지역 검색"} /><Button type="submit" disabled={busy || (category ? !pickedPoint : false)} className="!w-auto !px-4 !py-3">{busy ? "검색 중" : "검색"}</Button></form><label className="mt-3 flex items-center justify-between rounded-xl bg-bg p-3 text-sm"><span>{pickedPoint ? `선택 위치 주변 ${radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}` : "지도에서 위치를 선택해 주변 검색"}</span><input type="checkbox" disabled={!pickedPoint} checked={nearbyOnly} onChange={(event) => setNearbyOnly(event.target.checked)} /></label>{pickedPoint && <><div className="mt-2 flex gap-1">{[300, 500, 1000, 1500, 3000, 5000].map((value) => <button key={value} type="button" onClick={() => onRadiusChange(value)} className={`flex-1 rounded-lg py-2 text-xs font-bold ${radius === value ? "bg-coral text-white" : "bg-bg"}`}>{value >= 1000 ? `${value / 1000}km` : `${value}m`}</button>)}</div><div className="mt-2 flex flex-wrap gap-1">{[["RESTAURANT","맛집"],["CAFE","카페"],["CULTURE","문화"],["TOUR","관광"],["ACCOMMODATION","숙소"],["PLAY","놀거리"]].map(([value,label]) => <button key={value} type="button" onClick={() => { setNearbyOnly(true); setCategory(category === value ? "" : value); }} className={`rounded-full px-3 py-1.5 text-xs font-bold ${category === value ? "bg-violet-700 text-white" : "bg-bg"}`}>{label}</button>)}</div></>}<label className="mt-2 flex items-center justify-between rounded-xl bg-bg p-3 text-sm"><span>검색 결과 레이어</span><input type="checkbox" checked={layerVisible} onChange={(event) => { setLayerVisible(event.target.checked); onLayerChange(event.target.checked ? results.map((item, index) => ({ ...item, id: `search-${item.providerPlaceId || index}`, kind: "search" })) : []); }} /></label><div className="mt-4 space-y-2">{results.map((item, index) => <button key={`${item.providerPlaceId}-${index}`} type="button" onClick={() => pick(item)} className={`w-full rounded-2xl border p-3 text-left ${activeSelection?.providerPlaceId === item.providerPlaceId ? "border-coral bg-coral-soft" : "border-line"}`}><b className="block">{item.name}</b><small className="text-ink-2">{item.address || item.category}</small></button>)}</div>{activeSelection && <Button disabled={busy} className="mt-4" onClick={() => save(activeSelection)}>{busy ? "추가 중…" : `“${activeSelection.name}” 추가하기`}</Button>}</> : <><p className="rounded-xl bg-bg p-3 text-sm text-ink-2">지도의 원하는 지점을 눌러 주세요. 좌표 입력은 필요 없어요.</p>{pickedPoint && <><input value={manualName} onChange={(event) => setManualName(event.target.value)} className="mt-3 w-full rounded-xl border border-line p-3" placeholder="장소 이름" /><p className="mt-2 text-sm text-ink-2">{manualAddress}</p><Button disabled={busy || !manualName.trim()} className="mt-4" onClick={() => save({ name: manualName.trim(), roadAddress: manualAddress, lat: pickedPoint.lat, lon: pickedPoint.lon, sourceProvider: "MANUAL", inputMethod: "MANUAL_PIN" })}>{busy ? "추가 중…" : "이 위치 추가"}</Button></>}</>}
  </section>;
}
