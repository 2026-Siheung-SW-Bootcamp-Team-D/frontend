import { useState } from "react";
import { createBoard } from "../api/boards";
import { ApiError } from "../api/errors";
import { Button } from "../components/UI";
import { navigate } from "../router/router";
import { useToast } from "../hooks/useToast";

function messageFor(error) {
  if (error instanceof ApiError) {
    if (error.code === "SESSION_STORAGE_UNAVAILABLE") return "이 브라우저에 참여 정보를 저장할 수 없어요. 저장 공간 설정을 확인해 주세요.";
    if (error.status === 429) return error.retryAfterSeconds ? `${error.retryAfterSeconds}초 뒤 다시 시도해 주세요.` : "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    if ([502, 503].includes(error.status)) return "서버가 잠시 불안정해요. 다시 시도해 주세요.";
  }
  return "모임을 만들지 못했어요. 다시 시도해 주세요.";
}

export function CreateBoardPage() {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function submit() {
    const boardName = name.trim();
    const creatorNickname = nickname.trim();
    if (boardName.length < 2 || boardName.length > 40) return setError("모임 이름은 2~40자로 입력해 주세요.");
    if (!creatorNickname || creatorNickname.length > 20) return setError("닉네임은 1~20자로 입력해 주세요.");

    setSubmitting(true);
    setError("");
    try {
      const response = await createBoard({ name: boardName, purpose: purpose.trim() || null, creatorNickname });
      setCreated(response);
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  const inviteUrl = created?.invitation?.inviteUrl;
  const boardId = created?.board?.boardId;
  return (
    <div className="min-h-screen bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <button type="button" onClick={() => navigate("/")} className="text-ink-2">← 홈</button>
        {created ? (
          <div className="mt-8 rounded-[20px] border border-line bg-white p-5">
            <h1 className="text-2xl font-bold">모임을 만들었어요</h1>
            <p className="mt-2 text-ink-2">참여 코드 <b>{created.invitation.inviteCode}</b></p>
            <p className="mt-3 break-all rounded-lg bg-bg p-3 text-sm">{inviteUrl}</p>
            <Button className="mt-4" onClick={() => navigator.clipboard?.writeText(inviteUrl).then(() => toast("초대 링크를 복사했어요"), () => toast("복사하지 못했어요. 링크를 길게 눌러 복사해 주세요."))}>초대 링크 복사</Button>
            <Button variant="navy" className="mt-2" onClick={() => navigate(`/boards/${boardId}/profile`)}>출발지 설정하기</Button>
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <h1 className="mt-8 text-2xl font-bold">새 모임 만들기</h1>
            <p className="mt-2 text-ink-2">친구들과 가고 싶은 곳을 모아보세요.</p>
            <label className="mt-6 block font-bold">모임 이름</label>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength="40" className="mt-2 w-full rounded-xl border border-line bg-white p-4" placeholder="예: 금요일 저녁 모임" />
            <label className="mt-4 block font-bold">모임 목적 <span className="text-ink-2">(선택)</span></label>
            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength="100" className="mt-2 w-full rounded-xl border border-line bg-white p-4" placeholder="예: 강남에서 식사" />
            <label className="mt-4 block font-bold">내 닉네임</label>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength="20" className="mt-2 w-full rounded-xl border border-line bg-white p-4" placeholder="모임에서 쓸 이름" />
            {error && <p className="mt-3 text-sm text-coral">{error}</p>}
            <Button type="submit" className="mt-6" disabled={submitting}>{submitting ? "모임을 만드는 중…" : "모임 만들기"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
