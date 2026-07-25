import { useEffect, useRef, useState } from "react";
import { Button } from "../components/UI";
import { createPlace, reverseGeocode, searchAddresses, searchPlaces } from "../api/places";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";
import { useServerBoard } from "../store/ServerBoardContext";

function errorMessage(error) {
  if (error?.status === 401) return "참여 정보가 만료되었어요. 초대 링크로 다시 입장해 주세요.";
  if (error?.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if ([502, 503].includes(error?.status)) return "검색 서비스가 일시적으로 응답하지 않아요. 다시 시도해 주세요.";
  return "요청을 처리하지 못했어요. 다시 시도해 주세요.";
}

function hasPoint(point) {
  return Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon));
}

export function AddPlacePage({ boardId }) {
  const { status: boardStatus, reload } = useServerBoard();
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState("idle");
  const [placeResults, setPlaceResults] = useState([]);
  const [addressResults, setAddressResults] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", roadAddress: "", jibunAddress: "", url: "", lat: "37.56", lon: "127.04" });
  const searchControllerRef = useRef(null);
  const reverseControllerRef = useRef(null);

  useEffect(() => () => {
    searchControllerRef.current?.abort();
    reverseControllerRef.current?.abort();
  }, []);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const manualPoint = hasPoint(form) ? { lat: Number(form.lat), lon: Number(form.lon) } : undefined;

  const runSearch = async () => {
    const term = query.trim();
    if (term.length < 2 || term.length > 80) {
      setSearchState("invalid");
      return;
    }
    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setSearchState("loading");
    setError("");
    try {
      const [places, addresses] = await Promise.all([
        searchPlaces(boardId, term, {}, { signal: controller.signal }),
        searchAddresses(boardId, term, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setPlaceResults(places);
      setAddressResults(addresses);
      setSearchState(places.length || addresses.length ? "results" : "empty");
    } catch (requestError) {
      if (controller.signal.aborted || requestError?.isCanceled) return;
      setError(errorMessage(requestError));
      setSearchState("error");
    }
  };

  const submit = async (request) => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await createPlace(boardId, request);
      await reload();
      navigate(`/boards/${boardId}`);
    } catch (requestError) {
      if (!requestError?.isCanceled) setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const addSearchPlace = (place) => submit({
    name: place.name,
    category: place.category || null,
    roadAddress: place.roadAddress || null,
    jibunAddress: place.jibunAddress || null,
    location: { lat: place.lat, lon: place.lon },
    source: { sourceProvider: "KAKAO", providerPlaceId: place.providerPlaceId || null, sourceUrl: place.sourceUrl || null, inputMethod: "SEARCH_PICK" },
  });

  const chooseAddress = (address) => {
    setForm((current) => ({ ...current, roadAddress: address.roadAddress, lat: String(address.lat), lon: String(address.lon) }));
    setTab("manual");
  };

  const updatePoint = async (point) => {
    setForm((current) => ({ ...current, lat: point.lat.toFixed(6), lon: point.lon.toFixed(6) }));
    reverseControllerRef.current?.abort();
    const controller = new AbortController();
    reverseControllerRef.current = controller;
    try {
      const address = await reverseGeocode(boardId, point, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setForm((current) => ({ ...current, roadAddress: address.roadAddress, jibunAddress: address.jibunAddress }));
      }
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) setError("주소를 찾지 못했어요. 주소는 직접 입력할 수 있어요.");
    }
  };

  const addManual = (external) => {
    const lat = Number(form.lat);
    const lon = Number(form.lon);
    if (!form.name.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError("장소명과 유효한 좌표를 입력해 주세요.");
      return;
    }
    if (external && !/^https:\/\//.test(form.url.trim())) {
      setError("https 지도 링크를 입력해 주세요.");
      return;
    }
    submit({
      name: form.name.trim(),
      category: external ? "외부 지도" : "직접 지정",
      roadAddress: form.roadAddress.trim() || null,
      jibunAddress: form.jibunAddress.trim() || null,
      location: { lat, lon },
      source: {
        sourceProvider: external ? "EXTERNAL" : "MANUAL",
        providerPlaceId: null,
        sourceUrl: external ? form.url.trim() : null,
        inputMethod: external ? "EXTERNAL_LINK" : "MANUAL_PIN",
      },
    });
  };

  if (boardStatus === "reentry") return <Reentry boardId={boardId} />;
  if (boardStatus === "loading") return <main className="min-h-screen p-5">모임 정보를 불러오는 중이에요.</main>;

  const field = (key, placeholder) => <input value={form[key]} onChange={(event) => updateForm(key, event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-white p-3" placeholder={placeholder} />;
  return <main className="min-h-screen p-4">
    <button type="button" onClick={() => navigate(`/boards/${boardId}`)}>← 모임</button>
    <h1 className="mt-4 text-xl font-bold">장소 추가</h1>
    <div className="mt-4 flex gap-2 overflow-auto">
      {[["search", "검색"], ["external", "외부 지도"], ["manual", "직접 핀"]].map(([value, label]) => <button key={value} type="button" disabled={submitting} onClick={() => setTab(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === value ? "bg-coral text-white" : "bg-white border border-line"}`}>{label}</button>)}
    </div>
    {error && <p role="alert" className="mt-3 rounded-xl bg-white p-3 text-sm text-coral">{error}</p>}
    {tab === "search" ? <section className="mt-5">
      <div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className="flex-1 rounded-xl border border-line bg-white p-3" placeholder="2자 이상 장소·주소 검색" /><Button disabled={searchState === "loading" || submitting} className="!w-auto !py-3" onClick={runSearch}>{searchState === "loading" ? "검색 중" : "검색"}</Button></div>
      {searchState === "invalid" && <p className="mt-2 text-sm text-coral">검색어는 2~80자로 입력해 주세요.</p>}
      {searchState === "error" && <div className="mt-4 rounded-xl bg-white p-4">검색에 실패했어요.<Button className="mt-3 !py-3" onClick={runSearch}>다시 시도</Button></div>}
      {searchState === "empty" && <p className="mt-4 rounded-xl bg-white p-4 text-ink-2">검색 결과가 없어요. 외부 지도나 직접 핀으로 추가할 수 있어요.</p>}
      {searchState === "results" && <div className="mt-4 space-y-2">
        {placeResults.map((item) => <div key={`place-${item.providerPlaceId}-${item.name}`} className="flex items-center gap-3 rounded-xl bg-white p-3"><span>📍</span><span className="flex-1"><b className="block">{item.name}</b><small>{item.address}</small></span><button disabled={submitting} type="button" className="rounded-lg bg-coral px-3 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={() => addSearchPlace(item)}>추가</button></div>)}
        {addressResults.map((item) => <div key={`address-${item.label}-${item.lat}-${item.lon}`} className="flex items-center gap-3 rounded-xl bg-white p-3"><span>🏠</span><span className="flex-1"><b className="block">{item.label}</b><small>{item.roadAddress}</small></span><button disabled={submitting} type="button" className="rounded-lg border border-line px-3 py-2 text-sm font-bold disabled:opacity-50" onClick={() => chooseAddress(item)}>핀으로 확인</button></div>)}
      </div>}
    </section> : <section className="mt-5">
      <p className="text-sm text-ink-2">{tab === "external" ? "장소명·주소·좌표와 원본 지도 링크를 확인해 주세요." : "지도에서 직접 눌러 좌표를 채우거나 직접 입력할 수 있어요."}</p>
      {tab === "manual" && <KakaoMap className="mt-4 h-64 w-full overflow-hidden rounded-2xl" center={manualPoint} onMapClick={updatePoint} />}
      {field("name", "장소명")}{field("roadAddress", "도로명 주소 (선택)")}{field("jibunAddress", "지번 주소 (선택)")}{field("lat", "위도")}{field("lon", "경도")}{tab === "external" && field("url", "https 지도 링크")}
      <Button disabled={submitting} className="mt-4 disabled:opacity-50" onClick={() => addManual(tab === "external")}>{submitting ? "추가 중" : "모임에 추가"}</Button>
    </section>}
  </main>;
}

function Reentry({ boardId }) {
  return <main className="flex min-h-screen items-center justify-center bg-bg px-5 text-center"><div><p className="font-bold">이 모임의 참여 정보가 없어요.</p><p className="mt-2 text-sm text-ink-2">초대 링크로 다시 입장한 뒤 이용해 주세요.</p><Button className="mt-4" onClick={() => navigate(`/boards/${boardId}/profile`)}>프로필로 이동</Button></div></main>;
}
