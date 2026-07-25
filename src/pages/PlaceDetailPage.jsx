import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, Button } from "../components/UI";
import { createComment, deleteComment, listComments, updateComment } from "../api/comments";
import { archivePlace, clearSelectedPlace, getPlace, selectPlace, setPlaceLike } from "../api/places";
import { KakaoMap } from "../maps/KakaoMap";
import { navigate } from "../router/router";
import { useServerBoard } from "../store/ServerBoardContext";

function errorMessage(error) {
  if (error?.status === 401) return "참여 정보가 만료되었어요. 초대 링크로 다시 입장해 주세요.";
  if (error?.status === 409) return "다른 참여자가 먼저 변경했어요. 최신 상태를 다시 불러왔어요.";
  if (error?.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if ([502, 503].includes(error?.status)) return "서비스가 일시적으로 응답하지 않아요. 다시 시도해 주세요.";
  return "요청을 처리하지 못했어요. 다시 시도해 주세요.";
}

export function PlaceDetailPage({ boardId, placeId }) {
  const { board, currentParticipantId, status: boardStatus, reload } = useServerBoard();
  const [place, setPlace] = useState(null);
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [mutating, setMutating] = useState(false);
  const loadControllerRef = useRef(null);

  const load = useCallback(async () => {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    setStatus("loading");
    setError("");
    try {
      const [nextPlace, nextComments] = await Promise.all([
        getPlace(boardId, placeId, { signal: controller.signal }),
        listComments(boardId, placeId, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setPlace(nextPlace);
      setComments(nextComments);
      setStatus("ready");
    } catch (requestError) {
      if (controller.signal.aborted || requestError?.isCanceled) return;
      setError(errorMessage(requestError));
      setStatus(requestError?.status === 401 ? "reentry" : "error");
    }
  }, [boardId, placeId]);

  useEffect(() => {
    if (boardStatus === "reentry") return undefined;
    const timer = window.setTimeout(() => { load(); }, 0);
    return () => {
      window.clearTimeout(timer);
      loadControllerRef.current?.abort();
    };
  }, [boardStatus, load]);

  const mutate = async (operation, { navigateAfter = false } = {}) => {
    if (mutating) return;
    setMutating(true);
    setError("");
    try {
      await operation();
      await reload();
      if (navigateAfter) navigate(`/boards/${boardId}`);
      else await load();
    } catch (requestError) {
      if (requestError?.status === 409) await reload();
      if (!requestError?.isCanceled) setError(errorMessage(requestError));
    } finally {
      setMutating(false);
    }
  };

  const submitComment = () => {
    const content = commentText.trim();
    if (content.length < 1 || content.length > 500) {
      setError("댓글은 1~500자로 입력해 주세요.");
      return;
    }
    mutate(async () => {
      await createComment(boardId, placeId, content);
      setCommentText("");
    });
  };

  if (boardStatus === "reentry" || status === "reentry") return <Reentry boardId={boardId} />;
  if (status === "loading") return <main className="min-h-screen p-5">장소를 불러오는 중이에요.</main>;
  if (status === "error" || !place) return <main className="flex min-h-screen items-center justify-center bg-bg px-5 text-center"><div><p className="font-bold">장소를 불러오지 못했어요.</p><p className="mt-2 text-sm text-ink-2">{error}</p><Button className="mt-4" onClick={load}>다시 시도</Button><Button variant="line" className="mt-2" onClick={() => navigate(`/boards/${boardId}`)}>모임으로 돌아가기</Button></div></main>;
  const selected = place.selected || board?.selectedPlaceId === place.id;
  return <div className="flex h-screen flex-col bg-bg">
    <button type="button" aria-label="모임으로 돌아가기" className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-[12px] bg-white shadow-md" onClick={() => navigate(`/boards/${boardId}`)}>←</button>
    <div className="flex-1 overflow-y-auto">
      <KakaoMap className="h-[180px] w-full" center={{ lat: place.lat, lon: place.lon }} markers={[place]} selectedMarkerId={place.id} />
      <div className="px-5 py-4.5">
        <div className="text-[12px] font-bold text-coral">{place.category}</div>
        <h2 className="mt-1 text-[23px] font-bold leading-tight">{place.name}</h2>
        <p className="mt-1 text-[13px] text-ink-2">{place.address || "주소 정보 없음"}</p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-white p-3 text-sm text-coral">{error}</p>}
        <div className="mt-4 flex gap-2.5">
          <button disabled={mutating} type="button" aria-label={`좋아요 ${place.likeCount}`} className={`flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] py-3 text-[14px] font-bold disabled:opacity-50 ${place.likedByMe ? "border-coral bg-coral text-white" : "border-line bg-white text-ink"}`} onClick={() => mutate(() => setPlaceLike(boardId, placeId, !place.likedByMe))}><span>{place.likedByMe ? "🩷" : "🤍"}</span> {place.likeCount}</button>
          <button disabled={!place.sourceUrl} type="button" aria-label="원본 지도에서 상세 보기" className="w-[52px] rounded-[14px] border-[1.5px] border-line bg-white text-[18px] disabled:opacity-40" onClick={() => window.open(place.sourceUrl, "_blank", "noopener,noreferrer")}>🔗</button>
        </div>
        {!selected ? <Button disabled={mutating} className="mt-2.5 disabled:opacity-50" onClick={() => mutate(() => selectPlace(boardId, placeId))}>📍 여기를 '지금 여기'로</Button> : <Button disabled={mutating} variant="line" className="mt-2 disabled:opacity-50" onClick={() => mutate(() => clearSelectedPlace(boardId))}>현재 선택 해제</Button>}
        <Button disabled={mutating} variant="line" className="mt-2 disabled:opacity-50" onClick={() => { if (window.confirm("이 장소를 보관할까요?")) mutate(() => archivePlace(boardId, placeId), { navigateAfter: true }); }}>가고 싶은 곳 보관</Button>
        <div className="mb-1.5 mt-5.5 text-[14px] font-bold">의견 <span className="text-ink-3">{comments.length}</span></div>
        <div className="mb-4 space-y-3">{comments.map((comment) => <div key={comment.id} className="flex gap-2.5"><Avatar label={comment.authorName} /><div className="min-w-0 flex-1"><div className="text-[12.5px] font-bold">{comment.authorName}</div>{editingId === comment.id ? <><input className="mt-1 w-full rounded-lg border border-line p-2 text-[13px]" value={editingText} onChange={(event) => setEditingText(event.target.value)} /><div className="mt-1 flex gap-2"><button disabled={mutating} type="button" className="text-xs text-coral" onClick={() => { const content = editingText.trim(); if (content.length >= 1 && content.length <= 500) mutate(async () => { await updateComment(boardId, placeId, comment.id, content); setEditingId(null); }); else setError("댓글은 1~500자로 입력해 주세요."); }}>저장</button><button disabled={mutating} type="button" className="text-xs text-ink-2" onClick={() => setEditingId(null)}>취소</button></div></> : <><div className="mt-0.5 text-[13.5px]">{comment.content}</div><div className="mt-1 text-[10.5px] text-ink-3">{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ""}</div>{comment.authorId === currentParticipantId && <div className="mt-1 flex gap-2"><button disabled={mutating} type="button" className="text-xs text-coral" onClick={() => { setEditingId(comment.id); setEditingText(comment.content); }}>수정</button><button disabled={mutating} type="button" className="text-xs text-coral" onClick={() => mutate(() => deleteComment(boardId, placeId, comment.id))}>삭제</button></div>}</>}</div></div>)}</div>
        <div className="flex gap-2"><input disabled={mutating} className="flex-1 rounded-full border border-line px-4 py-3 text-[13.5px]" placeholder="의견을 남겨주세요" value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitComment(); }} /><button disabled={mutating} type="button" aria-label="댓글 등록" className="w-11 rounded-full bg-coral text-[17px] text-white disabled:opacity-50" onClick={submitComment}>➤</button></div>
      </div>
    </div>
  </div>;
}

function Reentry({ boardId }) {
  return <main className="flex min-h-screen items-center justify-center bg-bg px-5 text-center"><div><p className="font-bold">이 모임의 참여 정보가 없어요.</p><p className="mt-2 text-sm text-ink-2">초대 링크로 다시 입장한 뒤 이용해 주세요.</p><Button className="mt-4" onClick={() => navigate(`/boards/${boardId}/profile`)}>프로필로 이동</Button></div></main>;
}
