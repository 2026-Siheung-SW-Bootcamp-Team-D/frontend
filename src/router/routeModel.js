export function parseRoute(path) {
  const [pathname, queryString = ""] = path.split("?", 2);
  const pathParts = pathname.split("/").filter(Boolean);
  const query = new URLSearchParams(queryString);

  if (!pathParts.length) return { route: "home", params: {} };

  if (pathParts[0] === "join" && pathParts[1]) {
    return { route: "join", params: { code: pathParts[1] } };
  }

  if (pathParts[0] === "boards" && pathParts[1] === "new") {
    return { route: "create-board", params: {} };
  }

  if (pathParts[0] === "boards" && pathParts[1] && pathParts[2] === "add") {
    return { route: "add-place", params: { boardId: pathParts[1] } };
  }

  if (pathParts[0] === "boards" && pathParts[1] && pathParts[2] === "profile") {
    return { route: "profile", params: { boardId: pathParts[1] } };
  }

  if (pathParts[0] === "boards" && pathParts[1] && pathParts[2] === "course") {
    return { route: "course", params: { boardId: pathParts[1] } };
  }

  if (pathParts[0] === "boards" && pathParts[1] && pathParts[2] === "places" && pathParts[3]) {
    return { route: "place-detail", params: { boardId: pathParts[1], placeId: pathParts[3] } };
  }

  if (pathParts[0] === "boards" && pathParts[1] && (pathParts[2] === "area" || pathParts[2] === "explore")) {
    return { route: "area-search", params: { boardId: pathParts[1] } };
  }

  if (pathParts[0] === "boards" && pathParts[1] && pathParts[2] === "nearby") {
    return { route: "nearby", params: { boardId: pathParts[1], lat: query.get("lat"), lon: query.get("lon") } };
  }

  if (pathParts[0] === "boards" && pathParts[1]) {
    return { route: "board", params: { boardId: pathParts[1] } };
  }

  return { route: "not-found", params: {} };
}
