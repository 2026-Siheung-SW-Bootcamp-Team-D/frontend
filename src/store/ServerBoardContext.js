import { createContext, useContext } from "react";

export const ServerBoardContext = createContext(null);

export function useServerBoard() {
  const value = useContext(ServerBoardContext);
  if (!value) throw new Error("ServerBoardProvider 안에서만 useServerBoard를 사용할 수 있습니다.");
  return value;
}
