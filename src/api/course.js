import { boardRequestConfig, getApiClient } from "./client";
import { mapCourseDraft } from "./mappers";

function draftPath(boardId) {
  return `/boards/${encodeURIComponent(boardId)}/course-draft`;
}

function withEtag(response) {
  const draft = mapCourseDraft(response.data);
  return { ...draft, etag: response.headers?.etag || draft.etag };
}

export async function getCourseDraft(boardId, { signal } = {}) {
  return withEtag(await getApiClient().get(draftPath(boardId), boardRequestConfig(boardId, signal)));
}

export async function putCourseDraft(boardId, placeIds, etag, { signal } = {}) {
  const config = boardRequestConfig(boardId, signal);
  config.headers = { ...config.headers, "If-Match": etag };
  return withEtag(await getApiClient().put(draftPath(boardId), { placeIds }, config));
}

