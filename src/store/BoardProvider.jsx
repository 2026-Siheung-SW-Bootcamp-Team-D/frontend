import { useCallback, useReducer } from "react";
import { INITIAL_STATE } from "../data/mock.js";
import { BoardContext } from "./BoardContext";

const now = () => new Date();
const id = (prefix) => `${prefix}-${Date.now()}`;

function updateCurrent(state, patch) {
  const currentParticipant = { ...state.currentParticipant, ...patch };
  return { currentParticipant, participants: state.participants.map((person) => person.id === currentParticipant.id ? currentParticipant : person) };
}

function reducer(state, action) {
  switch (action.type) {
    case "CREATE": { const boardId = id("meeting"); const participant = { id: id("participant"), boardId, nickname: action.data.nickname, avatar: "🙂", color: "p1", hasOrigin: false }; const board = { ...state.board, id: boardId, name: action.data.name, inviteCode: `Y${String(Date.now()).slice(-5)}`, selectedPlaceId: null, selectedBy: null, selectedAt: null, lastSelectionChange: null }; return { ...state, board, currentParticipant: participant, participants: [participant], places: [], comments: {}, recentMeetings: [{ id: boardId, name: board.name, inviteCode: board.inviteCode, updatedAt: now() }, ...state.recentMeetings] }; }
    case "JOIN": { const participant = { id: id("participant"), boardId: state.board.id, nickname: action.data.nickname, avatar: "✨", color: "p2", hasOrigin: false }; return { ...state, currentParticipant: participant, participants: [...state.participants, participant], recentMeetings: [{ id: state.board.id, name: state.board.name, inviteCode: state.board.inviteCode, updatedAt: now() }, ...state.recentMeetings.filter((item) => item.id !== state.board.id)] }; }
    case "PROFILE": return { ...state, ...updateCurrent(state, action.data) };
    case "ADD_PLACE": { if (state.places.some((place) => place.name === action.data.name && place.address === action.data.address)) return state; const place = { id: id("place"), boardId: state.board.id, proposerId: state.currentParticipant.id, proposerName: state.currentParticipant.nickname, likeCount: 0, likedByMe: false, createdAt: now(), ...action.data }; return { ...state, places: [place, ...state.places] }; }
    case "REMOVE_PLACE": { const lastSelectionChange = state.board.selectedPlaceId === action.id ? { by: state.currentParticipant.nickname, at: now(), type: "해제" } : state.board.lastSelectionChange; return { ...state, places: state.places.filter((place) => place.id !== action.id), board: state.board.selectedPlaceId === action.id ? { ...state.board, selectedPlaceId: null, selectedBy: state.currentParticipant.id, selectedAt: now(), lastSelectionChange } : state.board }; }
    case "LIKE": return { ...state, places: state.places.map((place) => place.id === action.id ? { ...place, likedByMe: !place.likedByMe, likeCount: place.likeCount + (place.likedByMe ? -1 : 1) } : place) };
    case "SELECT": { const selected = action.id || null; return { ...state, board: { ...state.board, selectedPlaceId: selected, selectedBy: state.currentParticipant.id, selectedAt: now(), lastSelectionChange: { by: state.currentParticipant.nickname, at: now(), type: selected ? "선택" : "해제" } } }; }
    case "COMMENT": { const comment = { id: id("comment"), placeId: action.placeId, authorId: state.currentParticipant.id, authorName: state.currentParticipant.nickname, authorColor: state.currentParticipant.color, body: action.text, createdAt: now() }; return { ...state, comments: { ...state.comments, [action.placeId]: [...(state.comments[action.placeId] || []), comment] } }; }
    case "DELETE_COMMENT": return { ...state, comments: { ...state.comments, [action.placeId]: (state.comments[action.placeId] || []).filter((comment) => comment.id !== action.commentId) } };
    default: return state;
  }
}

export function BoardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { ...INITIAL_STATE, recentMeetings: [{ id: INITIAL_STATE.board.id, name: INITIAL_STATE.board.name, inviteCode: INITIAL_STATE.board.inviteCode, updatedAt: now() }] });
  const send = useCallback((type, data) => dispatch({ type, data }), []);
  const value = { ...state,
    isInviteValid: (code) => code.trim().toUpperCase() === state.board.inviteCode,
    createBoard: (data) => send("CREATE", data), joinBoard: (data) => send("JOIN", data), updateProfile: (data) => send("PROFILE", data),
    addPlace: (data) => { const duplicate = state.places.some((place) => place.name === data.name && place.address === data.address); if (!duplicate) send("ADD_PLACE", data); return !duplicate; },
    removePlace: (placeId) => dispatch({ type: "REMOVE_PLACE", id: placeId }), toggleLike: (placeId) => dispatch({ type: "LIKE", id: placeId }), setSelectedPlace: (placeId) => dispatch({ type: "SELECT", id: placeId }), clearSelectedPlace: () => dispatch({ type: "SELECT", id: null }),
    addComment: (placeId, text) => dispatch({ type: "COMMENT", placeId, text }), deleteComment: (placeId, commentId) => dispatch({ type: "DELETE_COMMENT", placeId, commentId }),
  };
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}
