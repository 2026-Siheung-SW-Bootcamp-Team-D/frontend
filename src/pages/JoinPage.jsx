import { useContext, useState } from "react";
import { Button } from "../components/UI";
import { navigate } from "../router/router";
import { BoardContext } from "../store/BoardContext";

export function JoinPage({ code }) {
  const { getBoard, getInvite, isInviteValid, joinBoard } = useContext(BoardContext);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const valid = isInviteValid(code);
  const invite = getInvite(code);
  const invitedBoard = invite ? getBoard(invite.boardId) : null;

  const submit = () => { const value = nickname.trim(); if (value.length < 1 || value.length > 20) return setError("닉네임은 1~20자로 입력해 주세요."); joinBoard({ code, nickname: value }); navigate(`/boards/${invite.boardId}/profile`); };

  if (!valid || !invite || !invitedBoard) return <main className="flex min-h-screen items-center justify-center p-5 text-center"><div><h1 className="text-2xl font-bold">열 수 없는 초대예요</h1><p className="mt-2 text-ink-2">초대가 만료됐거나 존재하지 않아요.</p><Button className="mt-5" onClick={() => navigate("/")}>홈으로</Button></div></main>;
  return <main className="flex min-h-screen items-center justify-center p-5"><section className="w-full max-w-md"><p className="text-sm font-bold text-coral">{invitedBoard.name}에 초대받았어요</p><h1 className="mt-2 text-2xl font-bold">모임에서 쓸<br />이름을 알려주세요</h1><p className="mt-2 text-sm text-ink-2">다음 단계에서 출발지를 선택할 수 있어요.</p><input value={nickname} onChange={(e) => { setNickname(e.target.value); setError(""); }} maxLength="20" className="mt-7 w-full rounded-2xl border border-line bg-white p-4 font-bold" placeholder="닉네임" />{error && <p className="mt-2 text-sm text-coral">{error}</p>}<Button className="mt-5" onClick={submit}>입장하고 출발지 설정</Button></section></main>;
}
