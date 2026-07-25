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

export function mapBoard(value) {
  return {
    id: text(value?.boardId),
    name: text(value?.name),
    purpose: text(value?.purpose),
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
