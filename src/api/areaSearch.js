import { boardRequestConfig, getApiClient } from "./client";
import { mapAreaSearchJob } from "./mappers";

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
