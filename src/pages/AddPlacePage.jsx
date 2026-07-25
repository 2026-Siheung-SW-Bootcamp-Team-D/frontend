import { useContext, useState } from "react";
import { Button } from "../components/UI";
import { KakaoMap } from "../maps/KakaoMap";
import { useToast } from "../hooks/useToast";
import { navigate } from "../router/router";
import { BoardContext } from "../store/BoardContext";

const RESULTS = [
  { name: "왕십리 골목식당", address: "서울 성동구 왕십리로", category: "음식점", categoryEmoji: "🍜", lat: 37.561, lon: 127.039 },
  { name: "성수 느티나무 카페", address: "서울 성동구 성수이로", category: "카페", categoryEmoji: "☕", lat: 37.544, lon: 127.055 },
];

export function AddPlacePage({ boardId }) {
  const { addPlace } = useContext(BoardContext);
  const toast = useToast();
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [form, setForm] = useState({ name: "", address: "", url: "", lat: "37.56", lon: "127.04" });
  const manualPoint = { lat: Number(form.lat), lon: Number(form.lon) };

  const add = (place) => {
    if (!addPlace({ ...place, sourceProvider: place.sourceProvider || "MOCK", sourceUrl: place.sourceUrl || null })) return toast("이미 모임에 담긴 장소예요.");
    toast("모임에 추가했어요");
    navigate(`/boards/${boardId}`);
  };
  const search = () => {
    if (query.trim().length < 2 || query.trim().length > 80) return setStatus("invalid");
    if (query.includes("오류")) return setStatus("error");
    setStatus(query.includes("없음") ? "empty" : "results");
  };
  const manual = (external) => {
    const lat = Number(form.lat);
    const lon = Number(form.lon);
    if (form.name.trim().length < 1 || !form.address.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)) return toast("장소명·주소·유효한 좌표를 입력해 주세요.");
    if (external && (!/^https:\/\//.test(form.url) || !/(kakao\.com|naver\.com|google\.com)/.test(form.url))) return toast("허용된 https 지도 링크만 사용할 수 있어요.");
    add({ name: form.name.trim(), address: form.address.trim(), category: external ? "외부 지도" : "직접 지정", categoryEmoji: external ? "🔗" : "📍", lat, lon, sourceProvider: external ? "EXTERNAL" : "MANUAL", sourceUrl: external ? form.url : null });
  };
  const updatePoint = (point) => setForm((current) => ({ ...current, lat: point.lat.toFixed(6), lon: point.lon.toFixed(6) }));
  const field = (key, placeholder) => <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-2 w-full rounded-xl border border-line bg-white p-3" placeholder={placeholder} />;

  return <main className="min-h-screen p-4">
    <button type="button" onClick={() => navigate(`/boards/${boardId}`)}>← 모임</button>
    <h1 className="mt-4 text-xl font-bold">장소 추가</h1>
    <div className="mt-4 flex gap-2 overflow-auto">
      {[["search", "검색"], ["external", "외부 지도"], ["manual", "직접 핀"]].map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === value ? "bg-coral text-white" : "bg-white border border-line"}`}>{label}</button>)}
    </div>
    {tab === "search" ? <section className="mt-5">
      <div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className="flex-1 rounded-xl border border-line bg-white p-3" placeholder="2자 이상 장소·지역 검색" /><Button className="!w-auto !py-3" onClick={search}>검색</Button></div>
      {status === "invalid" && <p className="mt-2 text-sm text-coral">검색어는 2~80자로 입력해 주세요.</p>}
      {status === "error" && <div className="mt-4 rounded-xl bg-white p-4">검색에 실패했어요.<Button className="mt-3 !py-3" onClick={search}>다시 시도</Button></div>}
      {status === "empty" && <p className="mt-4 rounded-xl bg-white p-4 text-ink-2">검색 결과가 없어요. 외부 지도나 직접 핀으로 추가할 수 있어요.</p>}
      {status === "results" && <div className="mt-4 space-y-2">{RESULTS.map((item) => <div key={item.name} className="flex items-center gap-3 rounded-xl bg-white p-3"><span>{item.categoryEmoji}</span><span className="flex-1"><b className="block">{item.name}</b><small>{item.address}</small></span><button type="button" className="rounded-lg bg-coral px-3 py-2 text-sm font-bold text-white" onClick={() => add(item)}>추가</button></div>)}</div>}
    </section> : <section className="mt-5">
      <p className="text-sm text-ink-2">{tab === "external" ? "장소명·주소·좌표와 원본 지도 링크를 모두 확인해 주세요." : "지도에서 직접 눌러 좌표를 채우거나 직접 입력할 수 있어요."}</p>
      {tab === "manual" && <KakaoMap className="mt-4 h-64 w-full overflow-hidden rounded-2xl" center={manualPoint} onMapClick={updatePoint} />}
      {field("name", "장소명")}{field("address", "주소")}{field("lat", "위도")}{field("lon", "경도")}{tab === "external" && field("url", "https 지도 링크")}
      <Button className="mt-4" onClick={() => manual(tab === "external")}>모임에 추가</Button>
    </section>}
  </main>;
}
