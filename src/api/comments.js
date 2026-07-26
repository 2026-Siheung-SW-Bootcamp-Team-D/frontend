import { boardRequestConfig, getApiClient } from "./client";
import { mapComment } from "./mappers";

function path(boardId, placeId, commentId = "") {
  const base = `/boards/${encodeURIComponent(boardId)}/places/${encodeURIComponent(placeId)}/comments`;
  return commentId ? `${base}/${encodeURIComponent(commentId)}` : base;
}

export async function listComments(boardId, placeId, { page = 1, size = 20, signal } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  const response = await getApiClient().get(`${path(boardId, placeId)}?${query}`, boardRequestConfig(boardId, signal));
  return {
    items: (response.data?.items ?? []).map(mapComment),
    page: response.data?.page ?? { number: page, size, totalItems: 0, totalPages: 0 },
  };
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
