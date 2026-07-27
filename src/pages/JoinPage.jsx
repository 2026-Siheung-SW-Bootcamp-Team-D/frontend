import { useEffect, useRef, useState } from "react";
import { getInvitationPreview, joinBoard } from "../api/boards";
import { ApiError } from "../api/errors";
import { getBoardSession } from "../api/session";
import { Brand, Button, Mascot } from "../components/UI";
import { existingParticipantAction } from "../features/join/joinModel";
import { navigate } from "../router/router";

function previewMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 404) return "초대가 없거나 만료됐어요.";
    if (error.code === "PARTICIPANT_LIMIT_REACHED") return "이 모임은 참여 인원이 가득 찼어요.";
    if (error.status === 409) return "닫힌 모임의 초대예요.";
    if (error.status === 429) return error.retryAfterSeconds ? `${error.retryAfterSeconds}초 뒤 다시 확인해 주세요.` : "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    if ([502, 503].includes(error.status)) return "초대 정보를 불러오는 서버가 잠시 불안정해요.";
  }
  return "초대 정보를 불러오지 못했어요.";
}

export function JoinPage({ code }) {
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("loading");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [existingAction, setExistingAction] = useState(null);
  const joinControllerRef = useRef(null);

  useEffect(() => () => joinControllerRef.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    getInvitationPreview(code, { signal: controller.signal })
      .then((response) => {
        if (response.joinable === false) {
          setStatus("closed");
          return;
        }
        setPreview(response);
        setExistingAction(existingParticipantAction(response, getBoardSession(response.boardId)));
        setStatus("ready");
      })
      .catch((requestError) => {
        if (requestError?.isCanceled) return;
        setError(previewMessage(requestError));
        setStatus("error");
      });
    return () => controller.abort();
  }, [code]);

  async function submit() {
    const value = nickname.trim();
    if (value.length < 1 || value.length > 20) return setError("닉네임은 1~20자로 입력해 주세요.");
    const controller = new AbortController();
    joinControllerRef.current = controller;
    setJoining(true);
    setError("");
    try {
      const response = await joinBoard(code, { nickname: value }, { signal: controller.signal });
      if (controller.signal.aborted || joinControllerRef.current !== controller) return;
      navigate(`/boards/${response.boardId}/profile`);
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) setError(previewMessage(requestError));
    } finally {
      if (!controller.signal.aborted && joinControllerRef.current === controller) {
        joinControllerRef.current = null;
        setJoining(false);
      }
    }
  }

  if (status === "loading") return <main className="flex min-h-screen items-center justify-center p-5 text-ink-2">초대를 확인하는 중이에요…</main>;
  if (status === "closed") return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">닫힌 모임이에요</h1><p className="mt-2 text-ink-2">새 초대 링크를 받아 다시 시도해 주세요.</p><Button className="mt-5" onClick={() => navigate("/")}>홈으로</Button></div></main>;
  if (status === "error") return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">열 수 없는 초대예요</h1><p className="mt-2 text-ink-2">{error}</p><Button className="mt-5" onClick={() => navigate("/")}>홈으로</Button></div></main>;
  if (existingAction?.shouldReturn) return <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(150deg,#eaf8ff,#fffdf3)] p-5"><section className="w-full max-w-md rounded-[28px] border border-white bg-white/85 p-6 text-center shadow-[0_18px_45px_rgba(40,90,130,.12)]"><Brand className="justify-center" /><h1 className="mt-8 text-2xl font-black">이미 참여 중인 모임이에요</h1><p className="mt-2 text-sm text-ink-2">{preview?.boardName} 모임으로 돌아갈 수 있어요.</p><Button className="mt-6" onClick={() => navigate(`/boards/${existingAction.boardId}`)}>모임으로 돌아가기</Button><Button variant="line" className="mt-2" onClick={() => setExistingAction(null)}>다른 사람으로 참여</Button></section></main>;
  return <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(150deg,#eaf8ff,#fffdf3)] p-5"><form className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white bg-white/85 p-6 shadow-[0_18px_45px_rgba(40,90,130,.12)]" onSubmit={(event) => { event.preventDefault(); submit(); }}><Brand compact /><p className="mt-8 inline-flex rounded-lg bg-grass-soft px-2.5 py-1 text-sm font-black text-[#55762c]">{preview?.boardName}에 초대받았어요</p><h1 className="mt-3 text-[27px] font-black leading-tight tracking-tight">모임에서 쓸<br />이름을 알려주세요</h1><p className="mt-2 max-w-[16rem] text-sm leading-6 text-ink-2">다음 단계에서 출발지를 선택할 수 있어요. 정확한 출발지는 다른 참여자에게 보이지 않아요.</p><Mascot className="absolute right-1 top-16 h-28 w-32" /><input value={nickname} onChange={(event) => { setNickname(event.target.value); setError(""); }} maxLength="20" className="mt-7 w-full rounded-[16px] border border-line bg-white p-4 font-bold" placeholder="닉네임" />{error && <p className="mt-2 text-sm text-coral">{error}</p>}<Button type="submit" className="mt-5" disabled={joining}>{joining ? "입장하는 중…" : "입장하고 출발지 설정"}</Button></form></main>;
}
