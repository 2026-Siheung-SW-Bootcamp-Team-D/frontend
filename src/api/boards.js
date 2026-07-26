import { boardRequestConfig, getApiClient, publicRequestConfig } from "./client";
import { ApiError } from "./errors";
import { saveBoardSession } from "./session";

function storageError() {
  return new ApiError({
    status: null,
    code: "SESSION_STORAGE_UNAVAILABLE",
    retryAfterSeconds: null,
    requestId: null,
    isNetworkError: false,
    isCanceled: false,
  });
}

function saveCreatedBoardSession(response) {
  const boardId = response?.board?.boardId;
  const participantId = response?.creatorParticipant?.participantId;
  const participantToken = response?.participantToken;
  if (typeof boardId !== "string" || typeof participantId !== "string" || typeof participantToken !== "string") {
    return false;
  }
  if (!saveBoardSession(boardId, { participantId, participantToken, boardName: response?.board?.name, lastOpenedAt: new Date().toISOString() })) throw storageError();
  return true;
}

function saveJoinedBoardSession(response) {
  const { boardId, participantId, participantToken } = response ?? {};
  if (typeof boardId !== "string" || typeof participantId !== "string" || typeof participantToken !== "string") {
    return false;
  }
  if (!saveBoardSession(boardId, { participantId, participantToken, lastOpenedAt: new Date().toISOString() })) throw storageError();
  return true;
}

export async function createBoard({ name, purpose, creatorNickname }, { signal } = {}) {
  const response = await getApiClient().post(
    "/boards",
    { name, purpose: purpose ?? null, creatorNickname },
    publicRequestConfig(signal),
  );
  if (!saveCreatedBoardSession(response.data)) throw storageError();
  return response.data;
}

export async function getBoard(boardId, { signal } = {}) {
  const response = await getApiClient().get(`/boards/${encodeURIComponent(boardId)}`, boardRequestConfig(boardId, signal));
  return response.data;
}

export async function patchBoard(boardId, patch, { signal } = {}) {
  const response = await getApiClient().patch(
    `/boards/${encodeURIComponent(boardId)}`,
    patch,
    boardRequestConfig(boardId, signal),
  );
  return response.data;
}

export async function getInvitationPreview(inviteCode, { signal } = {}) {
  const response = await getApiClient().get(`/invitations/${encodeURIComponent(inviteCode)}`, publicRequestConfig(signal));
  return response.data;
}

export async function joinBoard(inviteCode, { nickname }, { signal } = {}) {
  const response = await getApiClient().post(
    `/invitations/${encodeURIComponent(inviteCode)}/participants`,
    { nickname },
    publicRequestConfig(signal),
  );
  if (!saveJoinedBoardSession(response.data)) throw storageError();
  return response.data;
}

export async function getParticipants(boardId, { signal } = {}) {
  const response = await getApiClient().get(
    `/boards/${encodeURIComponent(boardId)}/participants`,
    boardRequestConfig(boardId, signal),
  );
  return response.data;
}

export async function patchMyParticipant(boardId, patch, { signal } = {}) {
  const response = await getApiClient().patch(
    `/boards/${encodeURIComponent(boardId)}/participants/me`,
    patch,
    boardRequestConfig(boardId, signal),
  );
  return response.data;
}

export async function getBoardInvitation(boardId, { signal } = {}) {
  const response = await getApiClient().get(
    `/boards/${encodeURIComponent(boardId)}/invitation`,
    boardRequestConfig(boardId, signal),
  );
  return response.data;
}
