import { useContext, useEffect, useState } from "react";
import { Avatar, Button } from "../components/UI";
import { navigate } from "../router/router";
import { BoardContext } from "../store/BoardContext";

export function AreaSearchPage({ boardId }) {
  const { participants, areaAnchors } = useContext(BoardContext);
  const [selectedTime, setSelectedTime] = useState(45);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [failure, setFailure] = useState("");
  const hasAllOrigins = participants.every((participant) => participant.hasOrigin);
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setTimeout(() => {
      setRunning(false);
      setCompleted(true);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [running]);
  return (
    <div className="flex flex-col h-screen bg-bg">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-white border-b border-line">
        <button
          type="button"
          className="w-9 h-9 bg-white border border-line rounded-[11px]"
          onClick={() => navigate(`/boards/${boardId}`)}
        >
          ←
        </button>
        <div className="flex-1 text-center text-[15px] font-bold">
          동네 찾기
        </div>
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {!running && !completed ? (
          <>
            <div className="text-[12px] font-bold text-coral mb-2">
              정답이 아니라, 탐색 시작 지점이에요
            </div>
            <h2 className="text-[23px] font-bold mb-2 leading-tight">
              어디서 만날지
              <br />
              같이 찾아볼까요?
            </h2>
            <p className="text-[13.5px] text-ink-2 mb-4 leading-relaxed">
              함께 살펴볼 만한 동네를 보여드려요.
            </p>
            <div className="space-y-2 mb-4">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 bg-white border border-line rounded-[13px] px-3.5 py-2.5"
                >
                  <Avatar emoji={p.avatar} color={p.color} />
                  <div className="flex-1 text-[13.5px] font-bold">
                    {p.nickname}
                  </div>
                  <span
                    className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${p.hasOrigin ? "bg-coral-soft text-coral" : "bg-[#f0efe9] text-ink-3"}`}
                  >
                    {p.hasOrigin ? "출발지 등록됨" : "아직 안 함"}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-6">
              {[30, 45, 60].map((time) => (
                <button
                  key={time}
                  type="button"
                  className={`flex-1 border border-line rounded-[12px] py-3.5 text-[14px] font-bold ${selectedTime === time ? "bg-coral text-white border-coral" : "bg-white text-ink-2"}`}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}분
                </button>
              ))}
            </div>
            {!hasAllOrigins && <p className="mb-3 rounded-xl bg-coral-soft p-3 text-sm text-coral">출발지 미등록 참여자가 있어요. 참여자 정보에서 등록한 뒤 다시 시도해 주세요.</p>}
            {failure && <div className="mb-3 rounded-xl bg-white p-3 text-sm"><b className="text-coral">{failure}</b><p className="mt-1 text-ink-2">45분에서 찾기 어렵다면 60분으로 넓히거나 자유 지도 탐색을 이용해 보세요.</p><Button className="mt-2 !py-3" onClick={() => setFailure("")}>다시 시도</Button></div>}
            <Button onClick={() => { if (!hasAllOrigins) return; if (selectedTime === 30) return setFailure("공통으로 살펴볼 지역을 찾지 못했어요."); setRunning(true); }}>
              만나기 좋은 동네 찾기
            </Button>
          </>
        ) : running ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-[66px] h-[66px] border-[6px] border-coral-soft border-t-coral rounded-full animate-spin mb-5" />
            <div className="text-[16px] font-bold mb-1.5">
              만날 만한 지역을 찾고 있어요
            </div>
            <div className="text-[11.5px] text-ink-3 font-bold">
              1/4 · 도달 영역 계산 중
            </div>
            <button
              type="button"
              className="mt-6 text-[13px] text-coral font-bold"
              onClick={() => setRunning(false)}
            >
              취소
            </button>
          </div>
        ) : (
          <div>
            <div className="text-[12px] font-bold text-coral mb-2">
              탐색 시작 지점을 찾았어요
            </div>
            <h2 className="text-[23px] font-bold mb-2 leading-tight">
              여기부터
              <br />
              주변을 둘러볼까요?
            </h2>
            <div className="space-y-2.5">
              {areaAnchors.map((anchor, index) => (
                <button
                  key={anchor.id}
                  type="button"
                  className="w-full flex items-center gap-3 rounded-[16px] border border-line bg-white p-3.5 text-left"
                  onClick={() => navigate(`/boards/${boardId}/nearby`)}
                >
                  <span className="w-8 h-8 rounded-full bg-coral-soft text-coral flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <span className="text-xl">{anchor.emoji}</span>
                  <span>
                    <span className="block text-[14px] font-bold">
                      {anchor.name}
                    </span>
                    <span className="block text-[11.5px] text-ink-2 mt-0.5">
                      {anchor.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
