import { BoardProvider } from "./store/BoardProvider";
import { useHashRouter } from "./router/router";
import { Toast } from "./components/UI";
import { AddPlacePage } from "./pages/AddPlacePage";
import { AreaSearchPage } from "./pages/AreaSearchPage";
import { BoardPage } from "./pages/BoardPage";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { NearbyPage } from "./pages/NearbyPage";
import { PlaceDetailPage } from "./pages/PlaceDetailPage";
import { CreateBoardPage } from "./pages/CreateBoardPage";
import { ProfilePage } from "./pages/ProfilePage";

function AppContent() {
  const { route } = useHashRouter();

  const routes = {
    home: <HomePage />,
    join: <JoinPage code={route.params.code} />,
    "create-board": <CreateBoardPage />,
    board: <BoardPage boardId={route.params.boardId} />,
    "place-detail": <PlaceDetailPage boardId={route.params.boardId} placeId={route.params.placeId} />,
    "add-place": <AddPlacePage boardId={route.params.boardId} />,
    "area-search": <AreaSearchPage boardId={route.params.boardId} />,
    nearby: <NearbyPage boardId={route.params.boardId} />,
    profile: <ProfilePage boardId={route.params.boardId} />,
  };

  return (
    routes[route.route] || (
      <div className="text-center py-10">페이지를 찾을 수 없어요</div>
    )
  );
}

export default function App() {
  return (
    <BoardProvider>
      <div className="bg-bg min-h-screen w-full flex flex-col mx-auto relative">
        <AppContent />
        <Toast />
      </div>
    </BoardProvider>
  );
}
