import axios from "axios";
import { toApiError } from "./errors";
import { clearBoardSession, getBoardSession } from "./session";

const API_PATH = "/api/v1";
const apiClient = axios.create();
let configuredBaseUrl = null;

function readApiBaseUrl() {
  const value = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!value) {
    throw new Error("VITE_API_BASE_URL이 필요합니다. 예: http://localhost:8080/api/v1");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VITE_API_BASE_URL은 http 또는 https URL이어야 합니다.");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.pathname.replace(/\/$/, "") !== API_PATH) {
    throw new Error("VITE_API_BASE_URL은 /api/v1까지 포함해야 합니다.");
  }

  return value.replace(/\/$/, "");
}

export function getApiClient() {
  const baseUrl = readApiBaseUrl();
  if (configuredBaseUrl !== baseUrl) {
    apiClient.defaults.baseURL = baseUrl;
    configuredBaseUrl = baseUrl;
  }
  return apiClient;
}

apiClient.interceptors.request.use((config) => {
  const boardId = config.metadata?.boardId;
  if (!boardId) return config;

  const session = getBoardSession(boardId);
  if (session) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${session.participantToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const boardId = error?.config?.metadata?.boardId;
    if (error?.response?.status === 401 && typeof boardId === "string" && boardId.trim()) {
      clearBoardSession(boardId);
    }
    return Promise.reject(toApiError(error));
  },
);

export function boardRequestConfig(boardId, signal) {
  return {
    signal,
    metadata: { boardId },
  };
}

export function publicRequestConfig(signal) {
  return { signal };
}
