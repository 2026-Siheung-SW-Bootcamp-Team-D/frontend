import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBoard, getBoardInvitation, getParticipants } from "../api/boards";
import { ApiError } from "../api/errors";
import { mapBoard, mapParticipant } from "../api/mappers";
import { listPlaces } from "../api/places";
import { getBoardSession } from "../api/session";
import { ServerBoardContext } from "./ServerBoardContext";

const EMPTY_PAGE = { number: 1, size: 20, totalItems: 0, totalPages: 0 };
const EMPTY_DATA = { board: null, participants: [], places: [], placesPage: EMPTY_PAGE, invitation: null };

function decoratePlaces(places, participants) {
  const names = new Map(participants.map((participant) => [participant.participantId, participant.nickname]));
  return places.map((place) => ({ ...place, proposerName: names.get(place.proposerId) ?? "참여자" }));
}

export function ServerBoardProvider({ boardId, children }) {
  const session = useMemo(() => getBoardSession(boardId), [boardId]);
  const [state, setState] = useState(() => ({ status: session ? "loading" : "reentry", data: EMPTY_DATA, error: null, partialErrors: [] }));
  const activeBoardIdRef = useRef(boardId);
  const reloadControllerRef = useRef(null);
  const moreControllerRef = useRef(null);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    activeBoardIdRef.current = boardId;
  }, [boardId]);

  const reload = useCallback(async (externalSignal) => {
    reloadControllerRef.current?.abort();
    moreControllerRef.current?.abort();
    const controller = new AbortController();
    reloadControllerRef.current = controller;
    const signal = controller.signal;
    const generation = ++requestGenerationRef.current;
    const abortFromConsumer = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener("abort", abortFromConsumer, { once: true });
    const currentSession = getBoardSession(boardId);
    if (!currentSession) {
      if (activeBoardIdRef.current === boardId) setState({ status: "reentry", data: EMPTY_DATA, error: null, partialErrors: [] });
      externalSignal?.removeEventListener("abort", abortFromConsumer);
      return;
    }

    if (activeBoardIdRef.current === boardId) {
      setState((current) => ({ ...current, status: current.data.board ? "refreshing" : "loading", error: null, partialErrors: [] }));
    }

    const results = await Promise.allSettled([
      getBoard(boardId, { signal }),
      getParticipants(boardId, { signal }),
      listPlaces(boardId, { page: 1, size: 20, signal }),
      getBoardInvitation(boardId, { signal }),
    ]);

    externalSignal?.removeEventListener("abort", abortFromConsumer);
    if (signal.aborted || generation !== requestGenerationRef.current || activeBoardIdRef.current !== boardId) return;
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
    const placesResult = results[2].status === "fulfilled" ? results[2].value : { items: [], page: EMPTY_PAGE };
    const places = decoratePlaces(placesResult.items, participants);
    const invitation = results[3].status === "fulfilled" ? results[3].value : null;
    const partialErrors = failures.filter((error) => error !== boardResult.reason);
    setState({
      status: partialErrors.length > 0 ? "partial-error" : "ready",
      data: { board: mapBoard(boardResult.value), participants, places, placesPage: placesResult.page, invitation },
      error: null,
      partialErrors,
    });
  }, [boardId]);

  const loadMorePlaces = useCallback(async (externalSignal) => {
    const snapshot = state.data;
    if (snapshot.placesPage.number >= snapshot.placesPage.totalPages) return;
    moreControllerRef.current?.abort();
    const controller = new AbortController();
    moreControllerRef.current = controller;
    const generation = requestGenerationRef.current;
    const abortFromConsumer = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener("abort", abortFromConsumer, { once: true });
    try {
      const response = await listPlaces(boardId, {
        page: snapshot.placesPage.number + 1,
        size: snapshot.placesPage.size || 20,
        signal: controller.signal,
      });
      if (controller.signal.aborted || generation !== requestGenerationRef.current || activeBoardIdRef.current !== boardId) return;
      setState((current) => {
        const seen = new Set(current.data.places.map((place) => place.id));
        const appended = decoratePlaces(response.items, current.data.participants).filter((place) => !seen.has(place.id));
        return {
          ...current,
          data: { ...current.data, places: [...current.data.places, ...appended], placesPage: response.page },
        };
      });
    } catch (error) {
      if (!controller.signal.aborted && error?.status === 401) {
        setState({ status: "reentry", data: EMPTY_DATA, error: null, partialErrors: [] });
      }
      throw error;
    } finally {
      externalSignal?.removeEventListener("abort", abortFromConsumer);
    }
  }, [boardId, state.data]);

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
      reloadControllerRef.current?.abort();
      moreControllerRef.current?.abort();
    };
  }, [boardId, reload]);

  const value = useMemo(() => ({
    boardId,
    currentParticipantId: session?.participantId ?? null,
    status: state.status,
    board: state.data.board,
    participants: state.data.participants,
    places: state.data.places,
    placesPage: state.data.placesPage,
    invitation: state.data.invitation,
    error: state.error,
    partialErrors: state.partialErrors,
    // reload reads the active board ref only when consumers invoke it, never while rendering.
    // eslint-disable-next-line react-hooks/refs
    reload,
    // loadMorePlaces also reads request refs only after a consumer invokes it.
    // eslint-disable-next-line react-hooks/refs
    loadMorePlaces,
  }), [boardId, session?.participantId, state, reload, loadMorePlaces]);

  return <ServerBoardContext.Provider value={value}>{children}</ServerBoardContext.Provider>;
}
