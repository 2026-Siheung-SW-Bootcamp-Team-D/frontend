const CATEGORY_EMOJI = [
  ["카페", "☕"],
  ["음식", "🍽️"],
  ["식당", "🍽️"],
  ["술", "🍷"],
  ["문화", "🎭"],
];

function text(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value) {
  return Number.isFinite(value) ? value : null;
}

function mapPosition(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = number(value[0]);
  const lat = number(value[1]);
  if (lon === null || lat === null || lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
  return [lon, lat];
}

function mapRing(value) {
  if (!Array.isArray(value) || value.length < 4) return null;
  const ring = value.map(mapPosition);
  return ring.every(Boolean) ? ring : null;
}

function mapPolygonCoordinates(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const polygon = value.map(mapRing);
  return polygon.every(Boolean) ? polygon : null;
}

export function mapGeoJsonGeometry(value) {
  if (value?.type === "Polygon") {
    const coordinates = mapPolygonCoordinates(value.coordinates);
    return coordinates ? { type: "Polygon", coordinates } : null;
  }
  if (value?.type === "MultiPolygon" && Array.isArray(value.coordinates)) {
    const coordinates = value.coordinates.map(mapPolygonCoordinates);
    return coordinates.length > 0 && coordinates.every(Boolean) ? { type: "MultiPolygon", coordinates } : null;
  }
  return null;
}

export function mapBoard(value) {
  return {
    id: text(value?.boardId),
    name: text(value?.name),
    purpose: text(value?.purpose),
    updatedAt: value?.updatedAt ?? null,
    status: text(value?.status),
    selectedPlaceId: value?.selectedPlaceId ?? null,
    selectedByParticipantId: value?.selectedByParticipantId ?? null,
    selectedAt: value?.selectedAt ?? null,
    counts: value?.counts ?? { participants: 0, places: 0, comments: 0 },
  };
}

export function mapParticipant(value, currentParticipantId) {
  const mine = value?.participantId === currentParticipantId;
  const origin = value?.origin ?? {};
  const registered = origin.registered === true;
  return {
    id: text(value?.participantId),
    participantId: text(value?.participantId),
    nickname: text(value?.nickname, "참여자"),
    role: text(value?.role),
    avatarColor: text(value?.avatarColor, "#4A90E2"),
    hasOrigin: registered,
    origin: {
      registered,
      label: mine ? text(origin.label) : "",
      lat: mine ? number(origin.lat) : null,
      lon: mine ? number(origin.lon) : null,
    },
  };
}

export function mapPlace(value) {
  const category = text(value?.category, "장소");
  const categoryEmoji = CATEGORY_EMOJI.find(([needle]) => category.includes(needle))?.[1] ?? "📍";
  return {
    id: text(value?.placeId),
    placeId: text(value?.placeId),
    boardId: text(value?.boardId),
    status: text(value?.status),
    name: text(value?.name, "이름 없는 장소"),
    category,
    categoryEmoji,
    address: text(value?.roadAddress || value?.jibunAddress),
    roadAddress: text(value?.roadAddress),
    jibunAddress: text(value?.jibunAddress),
    lat: number(value?.location?.lat),
    lon: number(value?.location?.lon),
    sourceProvider: text(value?.source?.sourceProvider),
    providerPlaceId: text(value?.source?.providerPlaceId),
    sourceUrl: text(value?.source?.sourceUrl),
    inputMethod: text(value?.source?.inputMethod),
    proposerId: text(value?.createdByParticipantId),
    proposerName: "참여자",
    likeCount: Number.isFinite(value?.likeCount) ? value.likeCount : 0,
    likedByMe: value?.likedByMe === true,
    selected: value?.selected === true,
    commentCount: Number.isFinite(value?.commentCount) ? value.commentCount : 0,
    createdAt: value?.createdAt ?? null,
  };
}

export function mapComment(value) {
  return {
    id: text(value?.commentId),
    commentId: text(value?.commentId),
    placeId: text(value?.placeId),
    authorId: text(value?.authorParticipantId),
    authorParticipantId: text(value?.authorParticipantId),
    authorName: text(value?.authorNickname, "참여자"),
    content: text(value?.content),
    createdAt: value?.createdAt ?? null,
  };
}

export function mapCourseDraft(value) {
  const seen = new Set();
  const rawPlaceIds = Array.isArray(value?.placeIds)
    ? value.placeIds
    : (Array.isArray(value?.stops) ? value.stops : [])
      .slice()
      .sort((left, right) => (number(left?.orderIndex) ?? 0) - (number(right?.orderIndex) ?? 0))
      .map((stop) => stop?.placeId);
  const placeIds = rawPlaceIds
    .map((placeId) => text(placeId))
    .filter((placeId) => placeId && !seen.has(placeId) && seen.add(placeId));
  const version = Number.isInteger(value?.version) && value.version >= 0 ? value.version : 0;
  const legs = (Array.isArray(value?.legs) ? value.legs : [])
    .map((leg) => ({
      fromOrder: number(leg?.fromOrder),
      toOrder: number(leg?.toOrder),
      straightDistanceMeters: number(leg?.straightDistanceMeters),
      estimatedWalkMinutes: number(leg?.estimatedWalkMinutes),
      estimated: leg?.estimated !== false,
    }))
    .filter((leg) => leg.fromOrder !== null && leg.toOrder !== null);
  return { version, etag: `"draft-${version}"`, placeIds, legs };
}

export function mapTransitTimes(value) {
  return (Array.isArray(value?.items) ? value.items : []).map((item) => ({
    participantId: text(item?.participantId),
    nickname: text(item?.nickname, "참여자"),
    avatarColor: text(item?.avatarColor, "#4A90E2"),
    status: text(item?.status, "FAILED"),
    totalMinutes: number(item?.totalMinutes),
    transferCount: number(item?.transferCount),
    totalWalkMinutes: number(item?.totalWalkMinutes),
    route: item?.route ? {
      legs: (Array.isArray(item.route.legs) ? item.route.legs : []).map((leg) => ({
        mode: text(leg?.mode, "UNKNOWN"), routeName: text(leg?.routeName) || null,
        startName: text(leg?.startName) || null, endName: text(leg?.endName) || null,
        durationMinutes: number(leg?.durationMinutes) ?? 0,
      })),
      path: (Array.isArray(item.route.path) ? item.route.path : []).map((point) => ({ lon: number(point?.lon), lat: number(point?.lat) }))
        .filter((point) => point.lon !== null && point.lat !== null),
    } : null,
  })).filter((item) => item.participantId);
}

export function mapSearchCandidate(value) {
  return {
    providerPlaceId: text(value?.providerPlaceId),
    name: text(value?.name, "이름 없는 장소"),
    category: text(value?.category, "장소"),
    roadAddress: text(value?.roadAddress),
    jibunAddress: text(value?.jibunAddress),
    address: text(value?.roadAddress || value?.jibunAddress),
    lat: number(value?.location?.lat),
    lon: number(value?.location?.lon),
    sourceUrl: text(value?.sourceUrl),
  };
}

export function mapAddressCandidate(value) {
  return {
    label: text(value?.label, "선택한 위치"),
    roadAddress: text(value?.roadAddress),
    lat: number(value?.location?.lat),
    lon: number(value?.location?.lon),
  };
}

export function mergeOriginCandidates(placeCandidates, addressCandidates) {
  const seenLocations = new Set();
  const merged = [
    ...(placeCandidates ?? []).map((candidate) => ({
      label: candidate.name,
      roadAddress: candidate.roadAddress || candidate.jibunAddress || "",
      lat: candidate.lat,
      lon: candidate.lon,
      source: "KAKAO_KEYWORD",
      providerPlaceId: candidate.providerPlaceId || null,
    })),
    ...(addressCandidates ?? []).map((candidate) => ({
      label: candidate.label,
      roadAddress: candidate.roadAddress || "",
      lat: candidate.lat,
      lon: candidate.lon,
      source: "KAKAO_ADDRESS",
      providerPlaceId: null,
    })),
  ];

  return merged.filter((candidate) => {
    if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lon)) return false;
    const locationKey = `${candidate.lat.toFixed(6)}:${candidate.lon.toFixed(6)}`;
    if (seenLocations.has(locationKey)) return false;
    seenLocations.add(locationKey);
    return true;
  });
}

export function mapAreaSearchJob(value) {
  const anchors = Array.isArray(value?.result?.anchors) ? value.result.anchors : [];
  const isochrones = Array.isArray(value?.result?.isochrones) ? value.result.isochrones : [];
  const participantCenter = value?.result?.participantCenter;
  return {
    job: {
      id: text(value?.job?.jobId),
      status: text(value?.job?.status),
      durationMin: number(value?.job?.durationMin),
      errorCode: text(value?.job?.errorCode) || null,
    },
    anchors: anchors.map((anchor) => ({
      id: text(anchor?.anchorId),
      name: text(anchor?.name, "탐색 기준점"),
      category: text(anchor?.category, "장소"),
      roadAddress: text(anchor?.roadAddress),
      lat: number(anchor?.location?.lat),
      lon: number(anchor?.location?.lon),
      rank: number(anchor?.rank),
      providerPlaceId: text(anchor?.providerPlaceId),
      sourceProvider: text(anchor?.provider, "KAKAO"),
    })).filter((anchor) => anchor.lat !== null && anchor.lon !== null),
    isochrones: isochrones.map((area) => ({
      id: text(area?.areaId),
      geometry: mapGeoJsonGeometry(area?.geometry),
    })).filter((area) => area.geometry),
    participantCenter: {
      lat: number(participantCenter?.lat),
      lon: number(participantCenter?.lon),
    },
    commonArea: mapGeoJsonGeometry(value?.result?.commonArea),
  };
}
