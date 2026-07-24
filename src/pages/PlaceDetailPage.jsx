import { useContext, useState } from "react";
import { Avatar, Button } from "../components/UI";
import { useToast } from "../hooks/useToast";
import { navigate } from "../router/router";
import { BoardContext } from "../store/BoardContext";

export function PlaceDetailPage({ boardId, placeId }) {
  const {
    board,
    currentParticipant,
    places,
    comments,
    toggleLike,
    setSelectedPlace,
    clearSelectedPlace,
    addComment,
    deleteComment,
    removePlace,
  } = useContext(BoardContext);
  const [commentText, setCommentText] = useState("");
  const toast = useToast();
  const place = places.find((item) => item.id === placeId);
  if (!place)
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-5 text-center">
        <div>
          <p className="font-bold">찾을 수 없는 장소예요.</p>
          <Button className="mt-4" onClick={() => navigate(`/boards/${boardId}`)}>
            모임으로 돌아가기
          </Button>
        </div>
      </div>
    );
  const placeComments = comments[place.id] || [];
  const submitComment = () => {
    const text = commentText.trim();
    if (text.length < 1 || text.length > 500)
      return toast("댓글은 1~500자로 입력해 주세요.");
    addComment(place.id, text);
    setCommentText("");
    toast("의견을 남겼어요");
  };
  return (
    <div className="flex flex-col h-screen bg-bg">
      <button
        type="button"
        aria-label="모임으로 돌아가기"
        className="absolute top-4 left-4 z-10 w-9 h-9 bg-white rounded-[12px] flex items-center justify-center cursor-pointer shadow-md"
        onClick={() => navigate(`/boards/${boardId}`)}
      >
        ←
      </button>
      <div className="flex-1 overflow-y-auto">
        <div className="h-[180px] bg-[#e4e6df] relative flex items-center justify-center text-4xl">
          {place.categoryEmoji}
        </div>
        <div className="px-5 py-4.5">
          <div className="text-[12px] font-bold text-coral">
            {place.category} · {place.proposerName}
          </div>
          <h2 className="text-[23px] font-bold mt-1 leading-tight">
            {place.name}
          </h2>
          <p className="text-[13px] text-ink-2 mt-1">{place.address}</p>
          <div className="flex gap-2.5 mt-4">
            <button
              type="button"
              aria-label={`좋아요 ${place.likeCount}`}
              className={`flex-1 flex items-center justify-center gap-1.5 border-[1.5px] rounded-[14px] py-3 font-bold text-[14px] ${place.likedByMe ? "bg-coral border-coral text-white" : "bg-white border-line text-ink"}`}
              onClick={() => {
                toggleLike(place.id);
                toast("좋아요를 반영했어요");
              }}
            >
              <span>{place.likedByMe ? "🩷" : "🤍"}</span> {place.likeCount}
            </button>
            <button
              type="button"
              aria-label="원본 지도에서 상세 보기"
              className="flex-0 w-[52px] border-[1.5px] border-line bg-white rounded-[14px] text-[18px] cursor-pointer"
              onClick={() => {
                if (place.sourceUrl) window.open(place.sourceUrl, "_blank", "noopener,noreferrer");
                else toast("원본 지도 링크가 없는 직접 지정 장소예요.");
              }}>
              🔗
            </button>
          </div>
          {board.selectedPlaceId !== place.id && (
            <Button
              className="mt-2.5"
              onClick={() => {
                setSelectedPlace(place.id);
                toast("지금 여기로 바꿨어요");
                navigate(`/boards/${board.id}`);
              }}
            >
              📍 여기를 '지금 여기'로
            </Button>
          )}
          {board.selectedPlaceId === place.id && (
            <Button
              variant="line"
              className="mt-2"
              onClick={() => {
                clearSelectedPlace();
                toast("현재 선택을 해제했어요");
              }}
            >
              현재 선택 해제
            </Button>
          )}
          <Button
            variant="line"
            className="mt-2"
            onClick={() => {
              if (window.confirm("이 장소를 삭제할까요?")) {
                removePlace(place.id);
                toast("장소를 삭제했어요");
                navigate(`/boards/${board.id}`);
              }
            }}
          >
            가고 싶은 곳 삭제
          </Button>
          <div className="text-[14px] font-bold mt-5.5 mb-1.5">
            의견 <span className="text-ink-3">{placeComments.length}</span>
          </div>
          <div className="space-y-3 mb-4">
            {placeComments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                <Avatar
                  label={comment.authorName}
                  color={comment.authorColor}
                />
                <div>
                  <div className="text-[12.5px] font-bold">
                    {comment.authorName}
                  </div>
                  <div className="text-[13.5px] mt-0.5">{comment.body}</div>
                  <div className="text-[10.5px] text-ink-3 mt-1">방금 전</div>
                  {comment.authorId === currentParticipant.id && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-coral"
                      onClick={() => deleteComment(place.id, comment.id)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-line rounded-full px-4 py-3 text-[13.5px]"
              placeholder="의견을 남겨주세요"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitComment();
              }}
            />
            <button
              type="button"
              aria-label="댓글 등록"
              className="w-11 bg-coral text-white rounded-full text-[17px] cursor-pointer"
              onClick={submitComment}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
