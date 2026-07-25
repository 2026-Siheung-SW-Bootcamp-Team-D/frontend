import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBoard, getBoardInvitation, getParticipants } from "../api/boards";
import { ApiError } from "../api/errors";
import { mapBoard, mapParticipant } from "../api/mappers";
import { listPlaces } from "../api/places";
import { getBoardSession } from "../api/session";
import { ServerBoardContext } from "./ServerBoardContext";

const EMPTY_DATA = { board: null, participants: [], places: [], invitation: null };

function decoratePlaces(places, participants) {
  const names = new Map(participants.map((participant) => [participant.participantId, participant.nickname]));
  return places.map((place) => ({ ...place, proposerName: names.get(place.proposerId) ?? "참여자" }));
}

export function ServerBoardProvider({ boardId, children }) {
  const session = useMemo(() => getBoardSession(boardId), [boardId]);
  const [state, setState] = useState(() => ({ status: session ? "loading" : "reentry", data: EMPTY_DATA, error: null, partialErrors: [] }));
  const activeBoardIdRef = useRef(boardId);

  useEffect(() => {
    activeBoardIdRef.current = boardId;
  }, [boardId]);

  const reload = useCallback(async (signal) => {
    const currentSession = getBoardSession(boardId);
    if (!currentSession) {
      if (activeBoardIdRef.current === boardId) setState({ status: "reentry", data: EMPTY_DATA, error: null, partialErrors: [] });
      return;
    }

    if (activeBoardIdRef.current === boardId) {
      setState((current) => ({ ...current, status: current.data.board ? "refreshing" : "loading", error: null, partialErrors: [] }));
    }

    const results = await Promise.allSettled([
      getBoard(boardId, { signal }),
      getParticipants(boardId, { signal }),
      listPlaces(boardId, { signal }),
      getBoardInvitation(boardId, { signal }),
    ]);

    if (signal?.aborted || activeBoardIdRef.current !== boardId) return;
    const failures = results.filter((result) => result.status === "rejected").map((result) => result.reason);
    if (failures.some((error) => error?.isCanceled)) return;
    if (failures.some((error) => error?.status === 401)) {
      setState({ status: "reentry", data: EMPTY_DATA, error: null, partialErrors: [] });
      return;
    }

    const boardResult = results[0];
    if (boardResult.status === "rejected") {
      setState({ status: "error", data: EMPTY_DATA, error: boardResult.reason, partialErrors: failures });
      return;
    }

    const participants = results[1].status === "fulfilled"
      ? (results[1].value.items ?? []).map((participant) => mapParticipant(participant, currentSession.participantId))
      : [];
    const places = results[2].status === "fulfilled" ? decoratePlaces(results[2].value, participants) : [];
    const invitation = results[3].status === "fulfilled" ? results[3].value : null;
    const partialErrors = failures.filter((error) => error !== boardResult.reason);
    setState({
      status: partialErrors.length > 0 ? "partial-error" : "ready",
      data: { board: mapBoard(boardResult.value), participants, places, invitation },
      error: null,
      partialErrors,
    });
  }, [boardId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      reload(controller.signal).catch((error) => {
        if (controller.signal.aborted || activeBoardIdRef.current !== boardId || error?.isCanceled) return;
        if (error instanceof ApiError && error.status === 401) setState({ status: "reentry", data: EMPTY_DATA, error: null, partialErrors: [] });
        else setState({ status: "error", data: EMPTY_DATA, error, partialErrors: [] });
      });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [boardId, reload]);

  const value = useMemo(() => ({
    boardId,
    currentParticipantId: session?.participantId ?? null,
    status: state.status,
    board: state.data.board,
    participants: state.data.participants,
    places: state.data.places,
    invitation: state.data.invitation,
    error: state.error,
    partialErrors: state.partialErrors,
    // reload reads the active board ref only when consumers invoke it, never while rendering.
    // eslint-disable-next-line react-hooks/refs
    reload,
  }), [boardId, session?.participantId, state, reload]);

  return <ServerBoardContext.Provider value={value}>{children}</ServerBoardContext.Provider>;
}
