import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "./loadKakaoMaps";

const DEFAULT_CENTER = { lat: 37.5665, lon: 126.978 };

function isCoordinate(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lon);
}

function samePoint(left, right) {
  return left && right && left.lat === right.lat && left.lon === right.lon;
}

export function KakaoMap({
  center = DEFAULT_CENTER,
  markers = [],
  selectedMarkerId,
  onMarkerSelect,
  onMapClick,
  onIdle,
  className = "h-full w-full",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const sdkRef = useRef(null);
  const markerRefs = useRef([]);
  const mountedRef = useRef(false);
  const callbacksRef = useRef({ onMarkerSelect, onMapClick, onIdle });
  const lastIdlePointRef = useRef(null);
  const initialCenterRef = useRef(isCoordinate(center) ? center : DEFAULT_CENTER);
  const [status, setStatus] = useState("loading");
  const centerLat = center?.lat;
  const centerLon = center?.lon;

  useEffect(() => {
    callbacksRef.current = { onMarkerSelect, onMapClick, onIdle };
  }, [onMarkerSelect, onMapClick, onIdle]);

  useEffect(() => {
    mountedRef.current = true;

    loadKakaoMaps()
      .then((kakao) => {
        if (!mountedRef.current || !containerRef.current) return;

        const initialCenter = initialCenterRef.current;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(initialCenter.lat, initialCenter.lon),
          level: 6,
        });

        sdkRef.current = kakao;
        mapRef.current = map;
        setStatus("ready");

        kakao.maps.event.addListener(map, "click", (event) => {
          const latLng = event.latLng;
          callbacksRef.current.onMapClick?.({ lat: latLng.getLat(), lon: latLng.getLng() });
        });

        kakao.maps.event.addListener(map, "idle", () => {
          const mapCenter = map.getCenter();
          const nextPoint = { lat: mapCenter.getLat(), lon: mapCenter.getLng() };
          if (!samePoint(lastIdlePointRef.current, nextPoint)) {
            lastIdlePointRef.current = nextPoint;
            callbacksRef.current.onIdle?.(nextPoint);
          }
        });
      })
      .catch(() => {
        if (mountedRef.current) setStatus("unavailable");
      });

    return () => {
      mountedRef.current = false;
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
      mapRef.current = null;
      sdkRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = sdkRef.current;
    if (!map || !kakao || !Number.isFinite(centerLat) || !Number.isFinite(centerLon)) return;
    map.panTo(new kakao.maps.LatLng(centerLat, centerLon));
  }, [centerLat, centerLon]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = sdkRef.current;
    if (!map || !kakao) return undefined;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = markers
      .filter((marker) => isCoordinate(marker))
      .map((item) => {
        const marker = new kakao.maps.Marker({
          map,
          position: new kakao.maps.LatLng(item.lat, item.lon),
          title: item.name,
          zIndex: item.id === selectedMarkerId ? 2 : 1,
        });
        kakao.maps.event.addListener(marker, "click", () => callbacksRef.current.onMarkerSelect?.(item));
        return marker;
      });

    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
    };
  }, [markers, selectedMarkerId]);

  if (status === "unavailable") {
    return <div className={`${className} flex items-center justify-center bg-[#d7e5df] p-5 text-center text-sm text-ink-2`}>지도 사용 불가</div>;
  }

  return <div ref={containerRef} className={className} aria-label="Kakao 지도" />;
}
