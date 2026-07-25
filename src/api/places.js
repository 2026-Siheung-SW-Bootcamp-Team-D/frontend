import { boardRequestConfig, getApiClient } from "./client";
import { mapAddressCandidate, mapPlace, mapSearchCandidate } from "./mappers";

function pathWithQuery(path, values) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export async function listPlaces(boardId, { signal } = {}) {
  const response = await getApiClient().get(`/boards/${encodeURIComponent(boardId)}/places`, boardRequestConfig(boardId, signal));
  return (response.data?.items ?? []).map(mapPlace);
}

export async function getPlace(boardId, placeId, { signal } = {}) {
  const response = await getApiClient().get(`/boards/${encodeURIComponent(boardId)}/places/${encodeURIComponent(placeId)}`, boardRequestConfig(boardId, signal));
  return mapPlace(response.data);
}

export async function createPlace(boardId, request, { signal } = {}) {
  const response = await getApiClient().post(`/boards/${encodeURIComponent(boardId)}/places`, request, boardRequestConfig(boardId, signal));
  return mapPlace(response.data);
}

export async function archivePlace(boardId, placeId, { signal } = {}) {
  await getApiClient().delete(`/boards/${encodeURIComponent(boardId)}/places/${encodeURIComponent(placeId)}`, boardRequestConfig(boardId, signal));
}

export async function setPlaceLike(boardId, placeId, liked, { signal } = {}) {
  const path = `/boards/${encodeURIComponent(boardId)}/places/${encodeURIComponent(placeId)}/likes/me`;
  if (liked) await getApiClient().put(path, undefined, boardRequestConfig(boardId, signal));
  else await getApiClient().delete(path, boardRequestConfig(boardId, signal));
}

export async function selectPlace(boardId, placeId, { signal } = {}) {
  const response = await getApiClient().put(`/boards/${encodeURIComponent(boardId)}/selected-place`, { placeId }, boardRequestConfig(boardId, signal));
  return response.data;
}

export async function clearSelectedPlace(boardId, { signal } = {}) {
  await getApiClient().delete(`/boards/${encodeURIComponent(boardId)}/selected-place`, boardRequestConfig(boardId, signal));
}

export async function searchPlaces(boardId, query, options = {}, { signal } = {}) {
  const response = await getApiClient().get(pathWithQuery(`/boards/${encodeURIComponent(boardId)}/search/places`, { q: query, provider: "KAKAO", ...options }), boardRequestConfig(boardId, signal));
  return (response.data?.items ?? []).map(mapSearchCandidate);
}

export async function searchAddresses(boardId, query, { signal } = {}) {
  const response = await getApiClient().get(pathWithQuery(`/boards/${encodeURIComponent(boardId)}/search/addresses`, { q: query }), boardRequestConfig(boardId, signal));
  return (response.data?.items ?? []).map(mapAddressCandidate);
}

export async function reverseGeocode(boardId, point, { signal } = {}) {
  const response = await getApiClient().get(pathWithQuery(`/boards/${encodeURIComponent(boardId)}/search/reverse-geocode`, point), boardRequestConfig(boardId, signal));
  return {
    label: response.data?.label ?? "선택한 위치",
    roadAddress: response.data?.roadAddress ?? "",
    jibunAddress: response.data?.jibunAddress ?? "",
    lat: response.data?.location?.lat ?? point.lat,
    lon: response.data?.location?.lon ?? point.lon,
  };
}
