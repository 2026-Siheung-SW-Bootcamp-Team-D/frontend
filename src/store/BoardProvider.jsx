import { useEffect, useReducer } from "react";
import { INITIAL_STATE } from "../data/mock.js";
import { BoardContext } from "./BoardContext";

const stamp = () => Date.now();
const firstBoard = { ...INITIAL_STATE.board, lastSelectionChange: null };
const initialState = {
  boards: { [firstBoard.id]: firstBoard },
  participantsByBoard: { [firstBoard.id]: INITIAL_STATE.participants },
  placesByBoard: { [firstBoard.id]: INITIAL_STATE.places },
  comments: INITIAL_STATE.comments,
  currentBoardId: firstBoard.id,
  currentParticipant: INITIAL_STATE.currentParticipant,
  recentBoardIds: [firstBoard.id],
};

function reducer(state, action) {
  const board = state.boards[state.currentBoardId];
  if (action.type === "OPEN") return { ...state, currentBoardId: action.boardId };
  if (action.type === "CREATE") {
    const id = `meeting-${stamp()}`; const code = `Y${String(stamp()).slice(-5)}`;
    const participant = { id: `participant-${stamp()}`, boardId: id, nickname: action.data.nickname, avatar: "🙂", color: "p1", hasOrigin: false };
    const next = { id, name: action.data.name, inviteCode: code, selectedPlaceId: null, lastSelectionChange: null };
    return { ...state, boards: { ...state.boards, [id]: next }, participantsByBoard: { ...state.participantsByBoard, [id]: [participant] }, placesByBoard: { ...state.placesByBoard, [id]: [] }, currentBoardId: id, currentParticipant: participant, recentBoardIds: [id, ...state.recentBoardIds] };
  }
  if (action.type === "JOIN") {
    const target = Object.values(state.boards).find((item) => item.inviteCode === action.code);
    if (!target) return state;
    const participant = { id: `participant-${stamp()}`, boardId: target.id, nickname: action.nickname, avatar: "✨", color: "p2", hasOrigin: false };
    return { ...state, currentBoardId: target.id, currentParticipant: participant, participantsByBoard: { ...state.participantsByBoard, [target.id]: [...state.participantsByBoard[target.id], participant] }, recentBoardIds: [target.id, ...state.recentBoardIds.filter((id) => id !== target.id)] };
  }
  if (action.type === "PROFILE") { const person = { ...state.currentParticipant, ...action.data }; return { ...state, currentParticipant: person, participantsByBoard: { ...state.participantsByBoard, [board.id]: state.participantsByBoard[board.id].map((item) => item.id === person.id ? person : item) } }; }
  if (action.type === "ADD") { const places = state.placesByBoard[board.id]; const place = { id: `place-${stamp()}`, boardId: board.id, proposerId: state.currentParticipant.id, proposerName: state.currentParticipant.nickname, likeCount: 0, likedByMe: false, createdAt: new Date(), ...action.data }; return { ...state, placesByBoard: { ...state.placesByBoard, [board.id]: [place, ...places] } }; }
  if (action.type === "LIKE") return { ...state, placesByBoard: { ...state.placesByBoard, [board.id]: state.placesByBoard[board.id].map((place) => place.id === action.id ? { ...place, likedByMe: !place.likedByMe, likeCount: place.likeCount + (place.likedByMe ? -1 : 1) } : place) } };
  if (action.type === "SELECT") return { ...state, boards: { ...state.boards, [board.id]: { ...board, selectedPlaceId: action.id, lastSelectionChange: { by: state.currentParticipant.nickname, at: new Date(), type: action.id ? "선택" : "해제" } } } };
  if (action.type === "REMOVE") return { ...state, placesByBoard: { ...state.placesByBoard, [board.id]: state.placesByBoard[board.id].filter((place) => place.id !== action.id) }, boards: { ...state.boards, [board.id]: board.selectedPlaceId === action.id ? { ...board, selectedPlaceId: null, lastSelectionChange: { by: state.currentParticipant.nickname, at: new Date(), type: "해제" } } : board } };
  if (action.type === "COMMENT") { const comment = { id: `comment-${stamp()}`, placeId: action.placeId, authorId: state.currentParticipant.id, authorName: state.currentParticipant.nickname, authorColor: state.currentParticipant.color, body: action.text, createdAt: new Date() }; return { ...state, comments: { ...state.comments, [action.placeId]: [...(state.comments[action.placeId] || []), comment] } }; }
  if (action.type === "DELETE_COMMENT") return { ...state, comments: { ...state.comments, [action.placeId]: state.comments[action.placeId].filter((item) => item.id !== action.commentId) } };
  return state;
}

export function BoardProvider({ activeBoardId, children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const requestedBoard = activeBoardId
    ? state.boards[activeBoardId]
    : state.boards[state.currentBoardId];
  const isActiveBoardMissing = Boolean(activeBoardId) && !requestedBoard;
  const activeBoard = requestedBoard || state.boards[state.currentBoardId];
  const places = state.placesByBoard[activeBoard.id] || [];

  useEffect(() => {
    if (
      activeBoardId &&
      state.boards[activeBoardId] &&
      state.currentBoardId !== activeBoardId
    ) {
      dispatch({ type: "OPEN", boardId: activeBoardId });
    }
  }, [activeBoardId, state.boards, state.currentBoardId]);

  const inviteBoard = (code) => Object.values(state.boards).find((item) => item.inviteCode === code.trim().toUpperCase());
  const value = { ...state, board: requestedBoard, places, participants: state.participantsByBoard[activeBoard.id] || [], isActiveBoardMissing, areaAnchors: INITIAL_STATE.areaAnchors, recentMeetings: state.recentBoardIds.map((id) => state.boards[id]), isInviteValid: (code) => Boolean(inviteBoard(code)), getInvite: (code) => { const target = inviteBoard(code); return target && { boardId: target.id, status: "OPEN" }; }, getBoard: (id) => state.boards[id], openBoard: (boardId) => dispatch({ type: "OPEN", boardId }), createBoard: (data) => dispatch({ type: "CREATE", data }), joinBoard: ({ code, nickname }) => dispatch({ type: "JOIN", code: code.trim().toUpperCase(), nickname }), updateProfile: (data) => dispatch({ type: "PROFILE", data }), addPlace: (data) => { const duplicate = places.some((place) => place.name === data.name && place.address === data.address); if (!duplicate) dispatch({ type: "ADD", data }); return !duplicate; }, toggleLike: (id) => dispatch({ type: "LIKE", id }), setSelectedPlace: (id) => dispatch({ type: "SELECT", id }), clearSelectedPlace: () => dispatch({ type: "SELECT", id: null }), removePlace: (id) => dispatch({ type: "REMOVE", id }), addComment: (placeId, text) => dispatch({ type: "COMMENT", placeId, text }), deleteComment: (placeId, commentId) => dispatch({ type: "DELETE_COMMENT", placeId, commentId }) };
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}
