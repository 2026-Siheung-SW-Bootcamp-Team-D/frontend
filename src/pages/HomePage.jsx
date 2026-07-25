import { useMemo, useState } from "react";
import { getBoardSessionIds } from "../api/session";
import { Button } from "../components/UI";
import { navigate } from "../router/router";

function parseInviteCode(value) {
  const trimmed = value.trim();
  const hashMatch = trimmed.match(/#\/join\/([^/?#]+)/i);
  const candidate = hashMatch ? hashMatch[1] : trimmed;
  try {
    return decodeURIComponent(candidate).trim().toUpperCase();
  } catch {
    return "";
  }
}

export function HomePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const sessionBoardIds = useMemo(() => getBoardSessionIds(), []);

  function join() {
    const inviteCode = parseInviteCode(code);
    if (!inviteCode) return setError("초대 코드나 올바른 초대 링크를 입력해 주세요.");
    navigate(`/join/${encodeURIComponent(inviteCode)}`);
  }

  return <main className="flex min-h-screen items-center justify-center px-4 py-10"><section className="w-full max-w-md text-center"><p className="mb-3 text-xs font-bold tracking-[.25em] text-coral">연당</p><h1 className="text-3xl font-bold leading-tight">가고 싶은 곳,<br />친구들과 <span className="text-coral">함께</span> 모아요</h1><p className="mt-3 text-sm text-ink-2">한 모임에 장소를 모아 지도에서 비교하고 함께 골라요.</p><Button className="mt-7" onClick={() => navigate("/boards/new")}>＋ 새 모임 만들기</Button><div className="my-5 flex items-center gap-2 text-xs text-ink-3"><i className="h-px flex-1" />초대 코드로 입장<i className="h-px flex-1" /></div><div className="flex gap-2 rounded-2xl border border-line bg-white p-2"><input value={code} onChange={(event) => { setCode(event.target.value); setError(""); }} className="min-w-0 flex-1 px-3 font-bold outline-none" placeholder="예: A7K-92" /><Button variant="navy" className="!w-auto !px-4 !py-3" onClick={join}>입장</Button></div>{error && <p className="mt-2 text-left text-sm text-coral">{error}</p>}<div className="mt-8 text-left"><h2 className="mb-3 font-bold">최근 참여한 모임</h2>{sessionBoardIds.length ? sessionBoardIds.map((boardId) => <button key={boardId} type="button" onClick={() => navigate(`/boards/${boardId}/profile`)} className="mb-2 flex w-full items-center justify-between rounded-2xl border border-line bg-white p-4 text-left"><span><b className="block">참여한 모임</b><small className="text-ink-2">프로필과 출발지 보기</small></span><span>→</span></button>) : <p className="rounded-2xl bg-white p-4 text-sm text-ink-2">최근 참여한 모임이 없어요.</p>}</div></section></main>;
}
