import { useEffect, useRef, useState } from "react";
import { getInvitationPreview, joinBoard } from "../api/boards";
import { ApiError } from "../api/errors";
import { Button } from "../components/UI";
import { navigate } from "../router/router";

function previewMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 404) return "초대가 없거나 만료됐어요.";
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
  return <main className="flex min-h-screen items-center justify-center p-5"><form className="w-full max-w-md" onSubmit={(event) => { event.preventDefault(); submit(); }}><p className="text-sm font-bold text-coral">{preview?.boardName}에 초대받았어요</p><h1 className="mt-2 text-2xl font-bold">모임에서 쓸<br />이름을 알려주세요</h1><p className="mt-2 text-sm text-ink-2">다음 단계에서 출발지를 선택할 수 있어요.</p><input value={nickname} onChange={(event) => { setNickname(event.target.value); setError(""); }} maxLength="20" className="mt-7 w-full rounded-2xl border border-line bg-white p-4 font-bold" placeholder="닉네임" />{error && <p className="mt-2 text-sm text-coral">{error}</p>}<Button type="submit" className="mt-5" disabled={joining}>{joining ? "입장하는 중…" : "입장하고 출발지 설정"}</Button></form></main>;
}
