function isCoordinate(point) {
  return Number.isFinite(point?.lat)
    && Number.isFinite(point?.lon)
    && point.lat >= -90
    && point.lat <= 90
    && point.lon >= -180
    && point.lon <= 180;
}

export function collectPolylinePoints(polylines) {
  return polylines.flatMap((polyline) => (Array.isArray(polyline?.path) ? polyline.path : [])
    .filter(isCoordinate)
    .map(({ lon, lat }) => [lon, lat]));
}
