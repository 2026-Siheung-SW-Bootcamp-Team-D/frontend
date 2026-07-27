export function getPlaceDetailTarget(boardId, place) {
  if (place?.kind === "search") {
    try {
      const url = new URL(place.sourceUrl);
      if (!["http:", "https:"].includes(url.protocol)) return null;
      return { kind: "external", url: url.href };
    } catch {
      return null;
    }
  }

  if (!boardId || !place?.id) return null;
  return {
    kind: "internal",
    path: `/boards/${encodeURIComponent(boardId)}/places/${encodeURIComponent(place.id)}`,
  };
}
