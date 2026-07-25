import { boardRequestConfig, getApiClient } from "./client";
import { mapComment } from "./mappers";

function path(boardId, placeId, commentId = "") {
  const base = `/boards/${encodeURIComponent(boardId)}/places/${encodeURIComponent(placeId)}/comments`;
  return commentId ? `${base}/${encodeURIComponent(commentId)}` : base;
}

export async function listComments(boardId, placeId, { signal } = {}) {
  const response = await getApiClient().get(path(boardId, placeId), boardRequestConfig(boardId, signal));
  return (response.data?.items ?? []).map(mapComment);
}

export async function createComment(boardId, placeId, content, { signal } = {}) {
  const response = await getApiClient().post(path(boardId, placeId), { content }, boardRequestConfig(boardId, signal));
  return mapComment(response.data);
}

export async function updateComment(boardId, placeId, commentId, content, { signal } = {}) {
  await getApiClient().patch(path(boardId, placeId, commentId), { content }, boardRequestConfig(boardId, signal));
}

export async function deleteComment(boardId, placeId, commentId, { signal } = {}) {
  await getApiClient().delete(path(boardId, placeId, commentId), boardRequestConfig(boardId, signal));
}
