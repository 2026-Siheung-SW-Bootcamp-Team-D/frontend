import { useEffect, useMemo, useRef, useState } from "react";
import { getBoard, getParticipants, patchMyParticipant, removeParticipant } from "../api/boards";
import { ApiError } from "../api/errors";
import { reverseGeocode, searchOriginCandidates } from "../api/places";
import { getBoardSession } from "../api/session";
import { Button } from "../components/UI";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";
import { useToast } from "../hooks/useToast";

function messageFor(error) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "참여 정보가 만료됐어요. 초대 링크로 다시 입장해 주세요.";
    if (error.status === 404) return "모임을 찾을 수 없어요.";
    if (error.status === 409) return "진행 중인 지역 탐색이 있거나 모임이 닫혀 있어요. 최신 상태를 확인해 주세요.";
    if (error.status === 422) return "출발지 정보를 다시 확인해 주세요.";
    if (error.status === 429) return error.retryAfterSeconds ? `${error.retryAfterSeconds}초 뒤 다시 시도해 주세요.` : "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    if ([502, 503].includes(error.status)) return "서버가 잠시 불안정해요. 다시 시도해 주세요.";
  }
  return "정보를 처리하지 못했어요. 다시 시도해 주세요.";
}

function originFromParticipant(participant) {
  const origin = participant?.origin;
  if (!origin?.registered || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) return null;
  return { label: origin.label || "선택한 위치", lat: origin.lat, lon: origin.lon, source: "MANUAL_PIN" };
}

export function ProfilePage({ boardId }) {
  const toast = useToast();
  const session = useMemo(() => getBoardSession(boardId), [boardId]);
  const [board, setBoard] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [nickname, setNickname] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchState, setSearchState] = useState("idle");
  const [chosen, setChosen] = useState(null);
  const [originChanged, setOriginChanged] = useState(false);
  const [loading, setLoading] = useState(Boolean(session));
  const [saving, setSaving] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState("");
  const [error, setError] = useState("");
  const [sessionLost, setSessionLost] = useState(false);
  const searchControllerRef = useRef(null);
  const reverseControllerRef = useRef(null);
  const saveControllerRef = useRef(null);
  const removeControllerRef = useRef(null);

  useEffect(() => {
    if (!session) return undefined;
    const controller = new AbortController();
    Promise.all([
      getBoard(boardId, { signal: controller.signal }),
      getParticipants(boardId, { signal: controller.signal }),
    ])
      .then(([nextBoard, response]) => {
        if (controller.signal.aborted) return;
        const nextParticipants = response.items ?? [];
        const currentParticipant = nextParticipants.find((participant) => participant.participantId === session.participantId);
        setBoard(nextBoard);
        setParticipants(nextParticipants);
        setNickname(currentParticipant?.nickname ?? "");
        setChosen(originFromParticipant(currentParticipant));
        setOriginChanged(false);
      })
      .catch((requestError) => {
        if (controller.signal.aborted || requestError?.isCanceled) return;
        if (requestError?.status === 401) setSessionLost(true);
        setError(messageFor(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      searchControllerRef.current?.abort();
      reverseControllerRef.current?.abort();
      saveControllerRef.current?.abort();
      removeControllerRef.current?.abort();
    };
  }, [boardId, session]);

  async function runSearch() {
    const term = query.trim();
    if (term.length < 2 || term.length > 60) {
      setSearchState("invalid");
      return;
    }
    searchControllerRef.current?.abort();
    reverseControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setSearchState("loading");
    setError("");
    try {
      const nextResults = await searchOriginCandidates(boardId, term, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setResults(nextResults);
      setSearchState(nextResults.length ? "results" : "empty");
    } catch (requestError) {
      if (controller.signal.aborted || requestError?.isCanceled) return;
      if (requestError?.status === 401) setSessionLost(true);
      setError(messageFor(requestError));
      setSearchState("error");
    }
  }

  function changeQuery(value) {
    searchControllerRef.current?.abort();
    setQuery(value);
    setResults([]);
    setSearchState("idle");
  }

  function chooseSearchOrigin(origin) {
    searchControllerRef.current?.abort();
    reverseControllerRef.current?.abort();
    setChosen({ ...origin, source: origin.source || "KAKAO_ADDRESS" });
    setOriginChanged(true);
    setQuery("");
    setResults([]);
    setSearchState("idle");
  }

  async function chooseMapPoint(point) {
    searchControllerRef.current?.abort();
    reverseControllerRef.current?.abort();
    const controller = new AbortController();
    reverseControllerRef.current = controller;
    setError("");
    try {
      const address = await reverseGeocode(boardId, point, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setChosen({ label: address.label, lat: address.lat, lon: address.lon, source: "MANUAL_PIN" });
      setOriginChanged(true);
      setQuery("");
      setResults([]);
      setSearchState("idle");
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) {
        if (requestError?.status === 401) setSessionLost(true);
        setError(messageFor(requestError));
      }
    }
  }

  async function save() {
    if (saving) return;
    const nextNickname = nickname.trim();
    if (nextNickname.length < 1 || nextNickname.length > 20) return setError("닉네임은 1~20자로 입력해 주세요.");
    searchControllerRef.current?.abort();
    reverseControllerRef.current?.abort();
    saveControllerRef.current?.abort();
    const controller = new AbortController();
    saveControllerRef.current = controller;
    const patch = { nickname: nextNickname };
    if (originChanged) {
      patch.origin = chosen
        ? { label: chosen.label, lon: chosen.lon, lat: chosen.lat, source: chosen.source, providerPlaceId: chosen.providerPlaceId || null }
        : null;
    }
    setSaving(true);
    setError("");
    try {
      const response = await patchMyParticipant(boardId, patch, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setParticipants((current) => current.map((participant) => participant.participantId === response.participantId ? response : participant));
      setNickname(response.nickname);
      setChosen(originFromParticipant(response));
      setOriginChanged(false);
      toast("프로필을 저장했어요");
      navigate(`/boards/${boardId}`);
    } catch (requestError) {
      if (controller.signal.aborted || requestError?.isCanceled) return;
      if (requestError?.status === 401) setSessionLost(true);
      setError(messageFor(requestError));
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  async function removeMember(participant) {
    if (removingParticipantId || !window.confirm(`${participant.nickname}님을 모임에서 내보낼까요?`)) return;
    removeControllerRef.current?.abort();
    const controller = new AbortController();
    removeControllerRef.current = controller;
    setRemovingParticipantId(participant.participantId);
    setError("");
    try {
      await removeParticipant(boardId, participant.participantId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setParticipants((current) => current.filter((item) => item.participantId !== participant.participantId));
      toast(`${participant.nickname}님을 내보냈어요`);
    } catch (requestError) {
      if (controller.signal.aborted || requestError?.isCanceled) return;
      if (requestError?.status === 401) setSessionLost(true);
      setError(messageFor(requestError));
    } finally {
      if (!controller.signal.aborted) setRemovingParticipantId("");
    }
  }

  if (!session || sessionLost) return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">다시 입장해 주세요</h1><p className="mt-2 text-ink-2">이 모임의 참여 정보를 찾을 수 없어요.</p><Button className="mt-5" onClick={() => navigate("/")}>홈으로</Button></div></main>;
  if (loading) return <main className="flex min-h-screen items-center justify-center p-5 text-ink-2">참여자 정보를 불러오는 중이에요…</main>;
  if (error && !board) return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">프로필을 열 수 없어요</h1><p className="mt-2 text-ink-2">{error}</p><Button className="mt-5" onClick={() => window.location.reload()}>다시 시도</Button><Button variant="line" className="mt-2" onClick={() => navigate("/")}>홈으로</Button></div></main>;

  return <main className="min-h-screen p-5">
    <button type="button" onClick={() => navigate(`/boards/${boardId}`)}>← 모임으로</button>
    <p className="mt-6 text-sm text-coral">{board?.name}</p>
    <h1 className="mt-1 text-2xl font-bold">참여자 정보</h1>
    <label className="mt-5 block font-bold">내 닉네임</label>
    <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength="20" className="mt-2 w-full rounded-xl border border-line bg-white p-3" />
    <label className="mt-5 block font-bold">내 출발지</label>
    <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); runSearch(); }}>
      <input value={query} onChange={(event) => changeQuery(event.target.value)} maxLength="60" className="min-w-0 flex-1 rounded-xl border border-line bg-white p-3" placeholder="역·건물·주소 검색" />
      <Button type="submit" className="!w-auto !py-3" disabled={searchState === "loading"}>{searchState === "loading" ? "검색 중" : "검색"}</Button>
    </form>
    {searchState === "invalid" && <p className="mt-2 text-sm text-coral">검색어는 2~60자로 입력해 주세요.</p>}
    {searchState === "empty" && <p className="mt-2 rounded-xl bg-white p-3 text-sm text-ink-2">검색 결과가 없어요. 지도에서 직접 선택할 수 있어요.</p>}
    {results.map((item) => <button key={`${item.label}-${item.lat}-${item.lon}`} type="button" onClick={() => chooseSearchOrigin(item)} className="mt-2 w-full rounded-xl border border-line bg-white p-3 text-left"><b>{item.label}</b><small className="ml-2 text-ink-2">{item.roadAddress || "좌표 확인됨"}</small></button>)}
    <KakaoMap className="mt-3 h-56 w-full overflow-hidden rounded-2xl" center={chosen ?? undefined} markers={chosen ? [{ id: "origin", name: chosen.label, ...chosen }] : []} onMapClick={chooseMapPoint} />
    {chosen ? <div className="mt-2 flex items-center justify-between gap-3 text-sm"><p className="text-coral">선택됨: {chosen.label}</p><button type="button" className="text-ink-2 underline" onClick={() => { setChosen(null); setOriginChanged(true); }}>출발지 삭제</button></div> : <p className="mt-2 text-sm text-ink-2">출발지를 선택하면 지역 찾기에 사용할 수 있어요.</p>}
    {error && <p className="mt-3 text-sm text-coral">{error}</p>}
    <Button className="mt-4" disabled={saving} onClick={save}>{saving ? "저장하는 중…" : "프로필 저장"}</Button>
    <div className="mt-7 space-y-2"><h2 className="font-bold">참여자</h2>{participants.map((participant) => <div key={participant.participantId} className="flex items-center gap-3 rounded-xl bg-white p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: participant.avatarColor }}>{participant.nickname?.[0]}</div><b className="min-w-0 flex-1 truncate">{participant.nickname}</b><small className="text-ink-2">{participant.origin?.registered ? "출발지 등록됨" : "미등록"}</small>{participants.find((item) => item.participantId === session.participantId)?.role === "HOST" && participant.role === "MEMBER" && <button type="button" className="rounded-lg border border-coral px-2 py-1 text-xs font-bold text-coral disabled:opacity-50" disabled={Boolean(removingParticipantId)} onClick={() => removeMember(participant)}>{removingParticipantId === participant.participantId ? "처리 중" : "내보내기"}</button>}</div>)}</div>
  </main>;
}
