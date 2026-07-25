import { BoardProvider } from "./store/BoardProvider";
import { useHashRouter } from "./router/router";
import { Toast } from "./components/UI";
import { useContext } from "react";
import { AddPlacePage } from "./pages/AddPlacePage";
import { AreaSearchPage } from "./pages/AreaSearchPage";
import { BoardPage } from "./pages/BoardPage";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { NearbyPage } from "./pages/NearbyPage";
import { PlaceDetailPage } from "./pages/PlaceDetailPage";
import { CreateBoardPage } from "./pages/CreateBoardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { BoardContext } from "./store/BoardContext";
import { ServerBoardProvider } from "./store/ServerBoardProvider";

function AppContent({ route }) {
  const { isActiveBoardMissing } = useContext(BoardContext);
  const isServerBoardRoute = ["board", "place-detail", "add-place"].includes(route.route);
  const isBoardScopedRoute = [
    "board",
    "place-detail",
    "add-place",
    "area-search",
    "nearby",
    "profile",
  ].includes(route.route);

  if (isBoardScopedRoute && !isServerBoardRoute && route.route !== "profile" && isActiveBoardMissing) {
    return <div className="py-10 text-center">페이지를 찾을 수 없어요</div>;
  }

  const routes = {
    home: <HomePage />,
    join: <JoinPage key={`join-${route.params.code}`} code={route.params.code} />,
    "create-board": <CreateBoardPage />,
    board: <BoardPage key={`board-${route.params.boardId}`} boardId={route.params.boardId} />,
    "place-detail": (
      <PlaceDetailPage
        key={`place-${route.params.boardId}-${route.params.placeId}`}
        boardId={route.params.boardId}
        placeId={route.params.placeId}
      />
    ),
    "add-place": (
      <AddPlacePage
        key={`add-${route.params.boardId}`}
        boardId={route.params.boardId}
      />
    ),
    "area-search": (
      <AreaSearchPage
        key={`area-${route.params.boardId}`}
        boardId={route.params.boardId}
      />
    ),
    nearby: (
      <NearbyPage
        key={`nearby-${route.params.boardId}`}
        boardId={route.params.boardId}
      />
    ),
    profile: (
      <ProfilePage
        key={`profile-${route.params.boardId}`}
        boardId={route.params.boardId}
      />
    ),
  };

  const page = routes[route.route] || <div className="py-10 text-center">페이지를 찾을 수 없어요</div>;
  return isServerBoardRoute
    ? <ServerBoardProvider key={route.params.boardId} boardId={route.params.boardId}>{page}</ServerBoardProvider>
    : page;
}

export default function App() {
  const { route } = useHashRouter();

  return (
    <BoardProvider activeBoardId={route.params.boardId}>
      <div className="relative mx-auto flex min-h-screen w-full flex-col bg-bg">
        <AppContent route={route} />
        <Toast />
      </div>
    </BoardProvider>
  );
}
