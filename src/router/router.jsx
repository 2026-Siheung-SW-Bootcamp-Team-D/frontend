import { useSyncExternalStore } from "react";

export function useHashRouter() {
  const getSnapshot = () => window.location.hash.slice(1) || "/";
  const getServerSnapshot = () => "/";
  const subscribe = (cb) => {
    window.addEventListener("hashchange", cb);
    return () => window.removeEventListener("hashchange", cb);
  };

  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // 경로 파싱: /boards/:boardId/places/:placeId -> route params
  const parseRoute = (path) => {
    const pathParts = path.split("/").filter(Boolean);

    // 홈
    if (!pathParts.length) return { route: "home", params: {} };

    // #/join/:code
    if (pathParts[0] === "join" && pathParts[1]) {
      return { route: "join", params: { code: pathParts[1] } };
    }

    // #/boards/new
    if (pathParts[0] === "boards" && pathParts[1] === "new") {
      return { route: "create-board", params: {} };
    }

    // #/boards/:boardId/add
    if (pathParts[0] === "boards" && pathParts[1] && pathParts[2] === "add") {
      return { route: "add-place", params: { boardId: pathParts[1] } };
    }

    if (
      pathParts[0] === "boards" &&
      pathParts[1] &&
      pathParts[2] === "profile"
    ) {
      return { route: "profile", params: { boardId: pathParts[1] } };
    }

    // #/boards/:boardId/places/:placeId
    if (
      pathParts[0] === "boards" &&
      pathParts[1] &&
      pathParts[2] === "places" &&
      pathParts[3]
    ) {
      return {
        route: "place-detail",
        params: { boardId: pathParts[1], placeId: pathParts[3] },
      };
    }

    // #/boards/:boardId/area
    if (
      pathParts[0] === "boards" &&
      pathParts[1] &&
      (pathParts[2] === "area" || pathParts[2] === "explore")
    ) {
      return { route: "area-search", params: { boardId: pathParts[1] } };
    }

    // #/boards/:boardId/nearby
    if (
      pathParts[0] === "boards" &&
      pathParts[1] &&
      pathParts[2] === "nearby"
    ) {
      return { route: "nearby", params: { boardId: pathParts[1] } };
    }

    // #/boards/:boardId (보드 메인)
    if (pathParts[0] === "boards" && pathParts[1]) {
      return { route: "board", params: { boardId: pathParts[1] } };
    }

    return { route: "not-found", params: {} };
  };

  const route = parseRoute(hash);

  return { hash, route };
}

export function navigate(to) {
  window.location.hash = `#${to}`;
}
