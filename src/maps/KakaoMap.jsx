import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "./loadKakaoMaps";

const DEFAULT_CENTER = { lat: 37.5665, lon: 126.978 };
const COMMON_AREA_STYLE = {
  strokeWeight: 2,
  strokeColor: "#9D174D",
  strokeOpacity: 0.9,
  strokeStyle: "solid",
  fillColor: "#9D174D",
  fillOpacity: 0.28,
  zIndex: 0,
};
const SELECTED_MARKER_IMAGE = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='44' height='56' viewBox='0 0 44 56'><circle cx='22' cy='22' r='18' fill='white' stroke='#EE6B5D' stroke-width='5'/><circle cx='22' cy='22' r='7' fill='#EE6B5D'/><path d='M22 55 12 33h20z' fill='#EE6B5D'/></svg>");

function courseMarkerImage(kakao, order, selected) {
  if (!Number.isInteger(order) || order < 1 || order > 10) return undefined;
  const fill = selected ? "#f0552d" : "#18385f";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56"><path d="M22 54C14 42 4 33 4 20a18 18 0 1 1 36 0c0 13-10 22-18 34Z" fill="${fill}"/><circle cx="22" cy="20" r="13" fill="white"/><text x="22" y="25" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="${fill}">${order}</text></svg>`;
  return new kakao.maps.MarkerImage(
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    new kakao.maps.Size(44, 56),
    { offset: new kakao.maps.Point(22, 56) },
  );
}

function isCoordinate(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lon);
}

function samePoint(left, right) {
  return left && right && left.lat === right.lat && left.lon === right.lon;
}

function toPolygonCoordinates(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function toKakaoPath(kakao, coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return null;
  const rings = coordinates.map((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) return null;
    const path = ring.map((position) => {
      const [lon, lat] = position ?? [];
      return Number.isFinite(lon) && Number.isFinite(lat)
        ? new kakao.maps.LatLng(lat, lon)
        : null;
    });
    return path.every(Boolean) ? path : null;
  });
  if (!rings.every(Boolean)) return null;
  return rings.length === 1 ? rings[0] : rings;
}

export function KakaoMap({
  center = DEFAULT_CENTER,
  markers = [],
  polygons = [],
  circles = [],
  fitBounds = false,
  selectedMarkerId,
  placeOverlay,
  onOverlayClose,
  onOverlayDetail,
  onMarkerSelect,
  onMapClick,
  onIdle,
  className = "h-full w-full",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const sdkRef = useRef(null);
  const markerRefs = useRef([]);
  const polygonRefs = useRef([]);
  const circleRefs = useRef([]);
  const overlayRef = useRef(null);
  const mountedRef = useRef(false);
  const callbacksRef = useRef({ onMarkerSelect, onMapClick, onIdle, onOverlayClose, onOverlayDetail });
  const lastIdlePointRef = useRef(null);
  const initialCenterRef = useRef(isCoordinate(center) ? center : DEFAULT_CENTER);
  const [status, setStatus] = useState("loading");
  const centerLat = center?.lat;
  const centerLon = center?.lon;

  useEffect(() => {
    callbacksRef.current = { onMarkerSelect, onMapClick, onIdle, onOverlayClose, onOverlayDetail };
  }, [onMarkerSelect, onMapClick, onIdle, onOverlayClose, onOverlayDetail]);

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
      polygonRefs.current.forEach((polygon) => polygon.setMap(null));
      polygonRefs.current = [];
      circleRefs.current.forEach((circle) => circle.setMap(null));
      circleRefs.current = [];
      overlayRef.current?.setMap(null);
      overlayRef.current = null;
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
        const selected = item.id === selectedMarkerId;
        const marker = new kakao.maps.Marker({
          map,
          position: new kakao.maps.LatLng(item.lat, item.lon),
          title: item.name,
          image: courseMarkerImage(kakao, item.order, selected) ?? (selected ? new kakao.maps.MarkerImage(SELECTED_MARKER_IMAGE, new kakao.maps.Size(44, 56), { offset: new kakao.maps.Point(22, 56) }) : undefined),
          zIndex: selected ? 2 : 1,
        });
        kakao.maps.event.addListener(marker, "click", () => callbacksRef.current.onMarkerSelect?.(item));
        return marker;
      });

    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
    };
  }, [markers, selectedMarkerId, status]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = sdkRef.current;
    if (!map || !kakao) return undefined;
    circleRefs.current.forEach((circle) => circle.setMap(null));
    circleRefs.current = circles.filter((circle) => isCoordinate(circle) && Number.isFinite(circle.radius)).map((circle) => new kakao.maps.Circle({
      map, center: new kakao.maps.LatLng(circle.lat, circle.lon), radius: circle.radius,
      strokeWeight: 2, strokeStyle: "dashed", strokeColor: "#6D28D9", strokeOpacity: 0.8, fillColor: "#6D28D9", fillOpacity: 0.1,
    }));
    return () => { circleRefs.current.forEach((circle) => circle.setMap(null)); circleRefs.current = []; };
  }, [circles, status]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = sdkRef.current;
    if (!map || !kakao) return undefined;

    polygonRefs.current.forEach((polygon) => polygon.setMap(null));
    polygonRefs.current = polygons.flatMap((item) => toPolygonCoordinates(item?.geometry)
      .map((coordinates) => toKakaoPath(kakao, coordinates))
      .filter(Boolean)
      .map((path) => new kakao.maps.Polygon({
        map,
        path,
        ...COMMON_AREA_STYLE,
        ...(item?.style ?? {}),
      })));

    return () => {
      polygonRefs.current.forEach((polygon) => polygon.setMap(null));
      polygonRefs.current = [];
    };
  }, [polygons, status]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = sdkRef.current;
    overlayRef.current?.setMap(null);
    overlayRef.current = null;
    if (!map || !kakao || !isCoordinate(placeOverlay)) return undefined;

    const content = document.createElement("section");
    content.setAttribute("aria-label", `${placeOverlay.name} 장소 미리보기`);
    content.style.cssText = "width:236px;border:1px solid #dce8ed;border-radius:16px;background:rgba(255,255,255,.97);padding:12px;box-shadow:0 12px 30px rgba(24,56,95,.22);font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;color:#172b49;";
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "장소 미리보기 닫기");
    close.textContent = "×";
    close.style.cssText = "float:right;border:0;border-radius:8px;background:#eaf1ff;color:#315fae;font-size:18px;line-height:22px;width:24px;height:24px;cursor:pointer;";
    close.addEventListener("click", () => callbacksRef.current.onOverlayClose?.());
    const category = document.createElement("p");
    category.textContent = placeOverlay.category || "장소";
    category.style.cssText = "margin:0;color:#4777d6;font-size:11px;font-weight:800;";
    const name = document.createElement("strong");
    name.textContent = placeOverlay.name || "선택한 장소";
    name.style.cssText = "display:block;margin-top:3px;padding-right:28px;font-size:15px;line-height:1.3;";
    const address = document.createElement("p");
    address.textContent = placeOverlay.address || "주소 정보가 없어요.";
    address.style.cssText = "margin:5px 0 0;color:#64768a;font-size:12px;line-height:1.45;";
    const detail = document.createElement("button");
    detail.type = "button";
    detail.textContent = placeOverlay.kind === "search" ? "카카오맵에서 상세 보기" : "상세 정보 보기";
    detail.style.cssText = "width:100%;margin-top:10px;border:0;border-radius:10px;background:#4777d6;color:white;padding:9px 10px;font-weight:800;font-size:12px;cursor:pointer;";
    detail.addEventListener("click", () => callbacksRef.current.onOverlayDetail?.(placeOverlay));
    content.append(close, category, name, address, detail);

    const overlay = new kakao.maps.CustomOverlay({
      map,
      position: new kakao.maps.LatLng(placeOverlay.lat, placeOverlay.lon),
      content,
      yAnchor: 1.24,
      zIndex: 5,
      clickable: true,
    });
    overlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
      if (overlayRef.current === overlay) overlayRef.current = null;
    };
  }, [placeOverlay, status]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = sdkRef.current;
    if (!fitBounds || !map || !kakao) return;
    const points = markers.filter(isCoordinate).map((marker) => [marker.lon, marker.lat]);
    polygons.forEach((item) => {
      toPolygonCoordinates(item?.geometry).forEach((polygon) => {
        polygon.forEach((ring) => {
          ring.forEach((position) => {
            const [lon, lat] = position ?? [];
            if (Number.isFinite(lon) && Number.isFinite(lat)) points.push([lon, lat]);
          });
        });
      });
    });
    if (points.length === 0) return;
    const bounds = new kakao.maps.LatLngBounds();
    points.forEach(([lon, lat]) => bounds.extend(new kakao.maps.LatLng(lat, lon)));
    map.setBounds(bounds, 80, 40, 220, 40);
  }, [fitBounds, markers, polygons, status]);

  if (status === "unavailable") {
    return <div className={`${className} flex items-center justify-center bg-[#d7e5df] p-5 text-center text-sm text-ink-2`}>지도 사용 불가</div>;
  }

  return <div ref={containerRef} className={className} aria-label="Kakao 지도" />;
}
