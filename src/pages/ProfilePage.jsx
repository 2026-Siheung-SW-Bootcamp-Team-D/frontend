import { useEffect, useMemo, useState } from "react";
import { getBoard, getParticipants, patchMyParticipant } from "../api/boards";
import { ApiError } from "../api/errors";
import { getBoardSession } from "../api/session";
import { Button } from "../components/UI";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";

const ORIGINS = [
  { label: "왕십리역", lat: 37.561, lon: 127.038 },
  { label: "성수역", lat: 37.544, lon: 127.055 },
  { label: "서울역", lat: 37.555, lon: 126.97 },
];

function messageFor(error) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "참여 정보가 만료됐어요. 초대 링크로 다시 입장해 주세요.";
    if (error.status === 404) return "모임을 찾을 수 없어요.";
    if (error.status === 409) return "닫힌 모임에서는 프로필을 수정할 수 없어요.";
    if (error.status === 422) return "출발지 정보를 다시 확인해 주세요.";
    if (error.status === 429) return error.retryAfterSeconds ? `${error.retryAfterSeconds}초 뒤 다시 시도해 주세요.` : "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    if ([502, 503].includes(error.status)) return "서버가 잠시 불안정해요. 다시 시도해 주세요.";
  }
  return "정보를 불러오지 못했어요. 다시 시도해 주세요.";
}

function originFromParticipant(participant) {
  const origin = participant?.origin;
  if (!origin?.registered || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) return null;
  return { label: origin.label || "선택한 위치", lat: origin.lat, lon: origin.lon };
}

export function ProfilePage({ boardId }) {
  const session = useMemo(() => getBoardSession(boardId), [boardId]);
  const [board, setBoard] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [nickname, setNickname] = useState("");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState(null);
  const [originChanged, setOriginChanged] = useState(false);
  const [loading, setLoading] = useState(Boolean(session));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sessionLost, setSessionLost] = useState(false);

  const results = query.trim().length >= 2 ? ORIGINS.filter((item) => item.label.includes(query.trim())) : [];

  useEffect(() => {
    if (!session) return undefined;
    const controller = new AbortController();
    Promise.all([
      getBoard(boardId, { signal: controller.signal }),
      getParticipants(boardId, { signal: controller.signal }),
    ])
      .then(([nextBoard, response]) => {
        const nextParticipants = response.items ?? [];
        const currentParticipant = nextParticipants.find((participant) => participant.participantId === session.participantId);
        setBoard(nextBoard);
        setParticipants(nextParticipants);
        setNickname(currentParticipant?.nickname ?? "");
        setChosen(originFromParticipant(currentParticipant));
        setOriginChanged(false);
      })
      .catch((requestError) => {
        if (requestError?.isCanceled) return;
        if (requestError?.status === 401) setSessionLost(true);
        setError(messageFor(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [boardId, session]);

  function chooseOrigin(origin) {
    setChosen(origin);
    setOriginChanged(true);
    setQuery("");
  }

  async function save() {
    const nextNickname = nickname.trim();
    if (nextNickname.length < 1 || nextNickname.length > 20) return setError("닉네임은 1~20자로 입력해 주세요.");
    const patch = { nickname: nextNickname };
    if (originChanged) {
      patch.origin = chosen
        ? { label: chosen.label, lon: chosen.lon, lat: chosen.lat, source: "MANUAL_PIN" }
        : null;
    }

    setSaving(true);
    setError("");
    try {
      const response = await patchMyParticipant(boardId, patch);
      setParticipants((current) => current.map((participant) => participant.participantId === response.participantId ? response : participant));
      setNickname(response.nickname);
      setChosen(originFromParticipant(response));
      setOriginChanged(false);
    } catch (requestError) {
      if (requestError?.status === 401) setSessionLost(true);
      setError(messageFor(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (!session || sessionLost) return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">다시 입장해 주세요</h1><p className="mt-2 text-ink-2">이 모임의 참여 정보를 찾을 수 없어요.</p><Button className="mt-5" onClick={() => navigate("/")}>홈으로</Button></div></main>;
  if (loading) return <main className="flex min-h-screen items-center justify-center p-5 text-ink-2">참여자 정보를 불러오는 중이에요…</main>;
  if (error && !board) return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">프로필을 열 수 없어요</h1><p className="mt-2 text-ink-2">{error}</p><Button className="mt-5" onClick={() => window.location.reload()}>다시 시도</Button><Button variant="line" className="mt-2" onClick={() => navigate("/")}>홈으로</Button></div></main>;

  return <main className="min-h-screen p-5"><button type="button" onClick={() => navigate("/")}>← 홈</button><p className="mt-6 text-sm text-coral">{board?.name}</p><h1 className="mt-1 text-2xl font-bold">참여자 정보</h1><label className="mt-5 block font-bold">내 닉네임</label><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength="20" className="mt-2 w-full rounded-xl border border-line bg-white p-3" /><label className="mt-5 block font-bold">내 출발지</label><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength="80" className="mt-2 w-full rounded-xl border border-line bg-white p-3" placeholder="역·건물·주소 검색" />{results.map((item) => <button key={item.label} type="button" onClick={() => chooseOrigin(item)} className="mt-2 w-full rounded-xl border border-line bg-white p-3 text-left"><b>{item.label}</b><small className="ml-2 text-ink-2">좌표 확인됨</small></button>)}<KakaoMap className="mt-3 h-56 w-full overflow-hidden rounded-2xl" center={chosen ?? undefined} markers={chosen ? [{ id: "origin", name: chosen.label, ...chosen }] : []} onMapClick={(point) => chooseOrigin({ label: "선택한 위치", ...point })} />{chosen ? <div className="mt-2 flex items-center justify-between gap-3 text-sm"><p className="text-coral">선택됨: {chosen.label}</p><button type="button" className="text-ink-2 underline" onClick={() => { setChosen(null); setOriginChanged(true); }}>출발지 삭제</button></div> : <p className="mt-2 text-sm text-ink-2">출발지를 선택하면 지역 찾기에 사용할 수 있어요.</p>}{error && <p className="mt-3 text-sm text-coral">{error}</p>}<Button className="mt-4" disabled={saving} onClick={save}>{saving ? "저장하는 중…" : "프로필 저장"}</Button><div className="mt-7 space-y-2"><h2 className="font-bold">참여자</h2>{participants.map((participant) => <div key={participant.participantId} className="flex items-center gap-3 rounded-xl bg-white p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{participant.nickname?.[0]}</div><b className="flex-1">{participant.nickname}</b><small className="text-ink-2">{participant.origin?.registered ? "출발지 등록됨" : "미등록"}</small></div>)}</div></main>;
}
