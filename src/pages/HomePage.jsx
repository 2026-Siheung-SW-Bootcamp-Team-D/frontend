import { useMemo, useState } from "react";
import { getRecentBoardSessions } from "../api/session";
import { Brand, Button, Mascot } from "../components/UI";
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
  const recentBoards = useMemo(() => getRecentBoardSessions(), []);
  const formatLastOpened = (value) => value ? new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "최근 참여";

  function join() {
    const inviteCode = parseInviteCode(code);
    if (!inviteCode) return setError("초대 코드나 올바른 초대 링크를 입력해 주세요.");
    navigate(`/join/${encodeURIComponent(inviteCode)}`);
  }

  return <main className="min-h-screen bg-[linear-gradient(150deg,#eaf8ff_0%,#fffdf3_58%)] px-4 py-6 sm:px-6"><section className="mx-auto w-full max-w-md"><Brand /><div className="relative mt-9 overflow-hidden rounded-[28px] border border-white/80 bg-white/55 px-6 pt-7 shadow-[0_18px_45px_rgba(40,90,130,.12)]"><p className="text-xs font-black tracking-[.14em] text-coral">친구들과 약속 잡기</p><h1 className="mt-3 text-[34px] font-black leading-[1.08] tracking-tight">어디서 만날지,<br /><span className="text-coral">함께 찾아봐요</span></h1><p className="mt-3 max-w-[15rem] text-sm leading-6 text-ink-2">각자 출발지를 등록하고 모두에게 좋은 장소를 골라요.</p><Mascot className="absolute -bottom-7 -right-8 h-48 w-52" /><div className="h-44" /></div><Button className="mt-5" onClick={() => navigate("/boards/new")}>＋ 새 모임 만들기</Button><form className="mt-3 flex gap-2 rounded-[18px] border border-line bg-white p-2 shadow-sm" onSubmit={(event) => { event.preventDefault(); join(); }}><input value={code} onChange={(event) => { setCode(event.target.value); setError(""); }} className="min-w-0 flex-1 px-3 font-bold outline-none" placeholder="초대 코드 또는 링크" /><Button type="submit" variant="navy" className="!w-auto !min-h-0 !px-4 !py-2.5">입장</Button></form>{error && <p className="mt-2 text-left text-sm text-coral">{error}</p>}<div className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">최근 참여한 모임</h2><span className="text-xs text-ink-3">이어서 보기</span></div>{recentBoards.length ? recentBoards.map((session) => <button key={session.boardId} type="button" onClick={() => navigate(`/boards/${session.boardId}`)} className="mb-2 flex w-full items-center justify-between rounded-[18px] border border-line bg-white p-4 text-left shadow-sm"><span><b className="block">{session.boardName}</b><small className="text-ink-2">마지막으로 연 시각 · {formatLastOpened(session.lastOpenedAt)}</small></span><span className="grid h-8 w-8 place-items-center rounded-xl bg-coral-soft text-coral">→</span></button>) : <div className="rounded-[18px] border border-dashed border-line bg-white/70 p-5 text-sm text-ink-2">처음이라면 새 모임을 만들거나 초대 코드로 입장해 보세요.</div>}</div></section></main>;
}
