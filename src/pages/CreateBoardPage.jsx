import { useContext, useState } from "react";
import { Button } from "../components/UI";
import { BoardContext } from "../store/BoardContext";
import { navigate } from "../router/router";
import { useToast } from "../hooks/useToast";

export function CreateBoardPage() {
  const { board, createBoard } = useContext(BoardContext);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const toast = useToast();
  const submit = () => {
    const boardName = name.trim();
    const userName = nickname.trim();
    if (boardName.length < 2 || boardName.length > 40)
      return setError("모임 이름은 2~40자로 입력해 주세요.");
    if (!userName || userName.length > 20)
      return setError("닉네임은 1~20자로 입력해 주세요.");
    createBoard({ name: boardName, nickname: userName });
    setCreated(true);
  };
  const inviteLink = `${window.location.origin}${window.location.pathname}#/join/${board.inviteCode}`;
  return (
    <div className="min-h-screen bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-ink-2"
        >
          ← 홈
        </button>
        {created ? (
          <div className="mt-8 rounded-[20px] bg-white p-5 border border-line">
            <h1 className="text-2xl font-bold">모임을 만들었어요</h1>
            <p className="mt-2 text-ink-2">
              참여 코드 <b>{board.inviteCode}</b>
            </p>
            <p className="mt-3 break-all rounded-lg bg-bg p-3 text-sm">
              {inviteLink}
            </p>
            <Button
              className="mt-4"
              onClick={() => navigator.clipboard?.writeText(inviteLink).then(() => toast("초대 링크를 복사했어요"), () => toast("복사하지 못했어요. 링크를 길게 눌러 복사해 주세요."))}
            >
              초대 링크 복사
            </Button>
            <Button
              variant="navy"
              className="mt-2"
              onClick={() => navigate(`/boards/${board.id}`)}
            >
              모임으로 이동
            </Button>
          </div>
        ) : (
          <>
            <h1 className="mt-8 text-2xl font-bold">새 모임 만들기</h1>
            <p className="mt-2 text-ink-2">친구들과 가고 싶은 곳을 모아보세요.</p>
            <label className="mt-6 block font-bold">모임 이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength="40"
              className="mt-2 w-full rounded-xl border border-line bg-white p-4"
              placeholder="예: 금요일 저녁 모임"
            />
            <label className="mt-4 block font-bold">내 닉네임</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength="20"
              className="mt-2 w-full rounded-xl border border-line bg-white p-4"
              placeholder="모임에서 쓸 이름"
            />
            {error && <p className="mt-3 text-sm text-coral">{error}</p>}
            <Button className="mt-6" onClick={submit}>
              모임 만들기
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
