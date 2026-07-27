export function moveCoursePlace(placeIds, placeId, direction) {
  const currentIndex = placeIds.indexOf(placeId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= placeIds.length) return [...placeIds];
  const next = [...placeIds];
  [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
  return next;
}

export function removeCoursePlace(placeIds, placeId) {
  return placeIds.filter((id) => id !== placeId);
}

export function orderPlacesByLikes(places) {
  return places
    .map((place, index) => ({ place, index }))
    .sort((left, right) => right.place.likeCount - left.place.likeCount || left.index - right.index)
    .map(({ place }) => place);
}
