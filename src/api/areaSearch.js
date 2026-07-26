import { boardRequestConfig, getApiClient } from "./client";
import { mapAreaSearchJob, mapGeoJsonGeometry } from "./mappers";

function jobPath(boardId, jobId = "") {
  const board = encodeURIComponent(boardId);
  return `/boards/${board}/area-search-jobs${jobId ? `/${encodeURIComponent(jobId)}` : ""}`;
}

export async function createAreaSearchJob(boardId, durationMin, { signal } = {}) {
  const response = await getApiClient().post(jobPath(boardId), { durationMin }, boardRequestConfig(boardId, signal));
  return mapAreaSearchJob(response.data);
}

export async function getAreaSearchJob(boardId, jobId, { signal } = {}) {
  const response = await getApiClient().get(jobPath(boardId, jobId), boardRequestConfig(boardId, signal));
  return mapAreaSearchJob(response.data);
}

export async function getAreaSearchMapResults(boardId, { signal } = {}) {
  const response = await getApiClient().get(`/boards/${encodeURIComponent(boardId)}/area-search-results`, boardRequestConfig(boardId, signal));
  return {
    results: (Array.isArray(response.data?.results) ? response.data.results : []).map((result) => ({
      id: typeof result?.jobId === "string" ? result.jobId : "",
      durationMin: Number.isFinite(result?.durationMin) ? result.durationMin : null,
      finishedAt: result?.finishedAt ?? null,
      participantCenter: Number.isFinite(result?.participantCenter?.lat) && Number.isFinite(result?.participantCenter?.lon) ? result.participantCenter : null,
      commonArea: mapGeoJsonGeometry(result?.commonArea),
    })).filter((result) => result.durationMin && result.commonArea),
  };
}
