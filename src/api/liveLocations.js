import { boardRequestConfig, getApiClient } from "./client";
import { mapLiveLocations } from "./mappers";

function path(boardId, suffix) {
  return `/boards/${encodeURIComponent(boardId)}${suffix}`;
}

export async function getLiveLocations(boardId, { signal } = {}) {
  const response = await getApiClient().get(path(boardId, "/live-locations"), boardRequestConfig(boardId, signal));
  return mapLiveLocations(response.data);
}

export async function putMyLiveLocation(boardId, location, { signal } = {}) {
  await getApiClient().put(path(boardId, "/participants/me/live-location"), location, boardRequestConfig(boardId, signal));
}

export async function deleteMyLiveLocation(boardId, { signal } = {}) {
  await getApiClient().delete(path(boardId, "/participants/me/live-location"), boardRequestConfig(boardId, signal));
}
