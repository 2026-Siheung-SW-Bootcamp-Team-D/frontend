import { useCallback, useEffect, useRef, useState } from "react";
import { deleteMyLiveLocation, getLiveLocations, putMyLiveLocation } from "../api/liveLocations";
import { isLiveCoordinate, shouldSendLocation } from "../features/liveLocation/liveLocationModel";

const POLL_INTERVAL_MS = 30_000;

function currentPosition(position) {
  const point = {
    lat: position?.coords?.latitude,
    lon: position?.coords?.longitude,
    accuracyMeters: position?.coords?.accuracy,
  };
  return isLiveCoordinate(point) ? point : null;
}

export function useLiveLocation(boardId) {
  const [sharing, setSharing] = useState(false);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState("");
  const watchIdRef = useRef(null);
  const pollControllerRef = useRef(null);
  const putControllerRef = useRef(null);
  const pollingRef = useRef(false);
  const lastSentRef = useRef(null);
  const lastPointRef = useRef(null);

  const poll = useCallback(async () => {
    if (pollingRef.current) return;
    pollControllerRef.current?.abort();
    const controller = new AbortController();
    pollControllerRef.current = controller;
    pollingRef.current = true;
    try {
      const next = await getLiveLocations(boardId, { signal: controller.signal });
      if (!controller.signal.aborted) setLocations(next);
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled && requestError?.status !== 401) setError("현재 위치를 불러오지 못했어요.");
    } finally {
      if (pollControllerRef.current === controller) pollingRef.current = false;
    }
  }, [boardId]);

  const send = useCallback(async (point, force = false) => {
    if (!isLiveCoordinate(point)) return;
    const now = Date.now();
    if (!force && !shouldSendLocation(lastSentRef.current, point, now)) return;
    putControllerRef.current?.abort();
    const controller = new AbortController();
    putControllerRef.current = controller;
    try {
      await putMyLiveLocation(boardId, point, { signal: controller.signal });
      if (!controller.signal.aborted) {
        lastSentRef.current = { ...point, sentAt: now };
        setError("");
        poll();
      }
    } catch (requestError) {
      if (!controller.signal.aborted && !requestError?.isCanceled) setError("내 위치를 공유하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }, [boardId, poll]);

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    lastSentRef.current = null;
    lastPointRef.current = null;
    setSharing(false);
    try {
      await deleteMyLiveLocation(boardId);
      await poll();
    } catch (requestError) {
      if (!requestError?.isCanceled) setError("위치 공유를 중지하지 못했어요.");
    }
  }, [boardId, poll]);

  const startSharing = useCallback(() => {
    if (watchIdRef.current !== null) return;
    if (!navigator.geolocation) {
      setError("이 기기에서는 위치 공유를 지원하지 않아요.");
      return;
    }
    setError("");
    setSharing(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point = currentPosition(position);
        if (point) {
          lastPointRef.current = point;
          send(point);
        }
      },
      () => {
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setError("위치 권한을 허용해야 공유할 수 있어요.");
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
  }, [send]);

  useEffect(() => {
    const initialTimer = window.setTimeout(poll, 0);
    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      pollControllerRef.current?.abort();
    };
  }, [poll]);

  useEffect(() => {
    if (!sharing) return undefined;
    const timer = window.setInterval(() => {
      if (lastPointRef.current) send(lastPointRef.current);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [send, sharing]);

  useEffect(() => () => {
    putControllerRef.current?.abort();
    if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }, []);

  return { sharing, locations, error, startSharing, stopSharing };
}
