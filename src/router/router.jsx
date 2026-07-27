import { useSyncExternalStore } from "react";
import { parseRoute } from "./routeModel";

export function useHashRouter() {
  const getSnapshot = () => window.location.hash.slice(1) || "/";
  const getServerSnapshot = () => "/";
  const subscribe = (cb) => {
    window.addEventListener("hashchange", cb);
    return () => window.removeEventListener("hashchange", cb);
  };

  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const route = parseRoute(hash);

  return { hash, route };
}

export function navigate(to) {
  window.location.hash = `#${to}`;
}
