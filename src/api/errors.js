import axios from "axios";

function readHeader(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name) ?? null;
  return headers[name] ?? headers[name.toLowerCase()] ?? null;
}

function parseRetryAfter(value, now = Date.now()) {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) return null;
  return Math.max(0, Math.ceil((retryAt - now) / 1000));
}

export class ApiError extends Error {
  constructor({ status, code, retryAfterSeconds, requestId, isNetworkError, isCanceled }) {
    super("API 요청을 처리하지 못했습니다.");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.requestId = requestId;
    this.isNetworkError = isNetworkError;
    this.isCanceled = isCanceled;
  }
}

export function toApiError(error) {
  if (error instanceof ApiError) return error;

  const response = error?.response;
  const errorBody = response?.data?.error;
  const status = Number.isInteger(response?.status) ? response.status : null;
  const code = typeof errorBody?.code === "string"
    ? errorBody.code
    : typeof response?.data?.code === "string"
      ? response.data.code
      : null;

  return new ApiError({
    status,
    code,
    retryAfterSeconds: parseRetryAfter(readHeader(response?.headers, "retry-after")),
    requestId: readHeader(response?.headers, "x-request-id")
      ?? (typeof errorBody?.requestId === "string" ? errorBody.requestId : null),
    isNetworkError: Boolean(axios.isAxiosError(error) && !response && error.code !== "ERR_CANCELED"),
    isCanceled: Boolean(error?.code === "ERR_CANCELED"),
  });
}
