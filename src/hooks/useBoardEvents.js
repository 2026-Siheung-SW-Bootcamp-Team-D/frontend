import { useEffect } from "react";
import { getBoardSession } from "../api/session";

function sseUrl(boardId, token) {
  const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "");
  return `${base}/boards/${boardId}/events?token=${encodeURIComponent(token)}`;
}

// EventSource는 axios 인스턴스를 거치지 않으므로 baseURL을 직접 조립하고,
// 커스텀 헤더를 못 붙이므로 토큰을 쿼리 파라미터로 보낸다.
export function useBoardEvents(boardId, onEvent) {
  useEffect(() => {
    const session = getBoardSession(boardId);
    if (!session) return undefined;

    const es = new EventSource(sseUrl(boardId, session.participantToken));
    es.addEventListener("update", (event) => {
      try {
        onEvent(JSON.parse(event.data));
      } catch {
        onEvent(null);
      }
    });

    // onerror에서 재연결하지 않는다. 브라우저가 자동 재연결하므로 여기서 또 만들면 중복 연결이 생긴다.
    return () => es.close();
  }, [boardId, onEvent]);
}
