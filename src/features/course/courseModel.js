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

export function orderPlacesForCourse(places, placeIds) {
  const placeById = new Map(places.map((place) => [place.id, place]));
  const orderedCoursePlaces = placeIds.map((placeId) => placeById.get(placeId)).filter(Boolean);
  const coursePlaceIds = new Set(placeIds);
  return [...orderedCoursePlaces, ...places.filter((place) => !coursePlaceIds.has(place.id))];
}
