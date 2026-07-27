import { useEffect } from "react";
import { useHashRouter, navigate } from "./router/router";
import { Brand, Button, Toast } from "./components/UI";
import { titleForRoute } from "./router/routeMeta";
import { AreaSearchPage } from "./pages/AreaSearchPage";
import { BoardPage } from "./pages/BoardPage";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { NearbyPage } from "./pages/NearbyPage";
import { PlaceDetailPage } from "./pages/PlaceDetailPage";
import { CreateBoardPage } from "./pages/CreateBoardPage";
import { CoursePage } from "./pages/CoursePage";
import { ProfilePage } from "./pages/ProfilePage";
import { ServerBoardProvider } from "./store/ServerBoardProvider";

function AppContent({ route }) {
  const isServerBoardRoute = ["board", "place-detail", "add-place", "area-search", "nearby", "course"].includes(route.route);

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
    "add-place": <BoardPage key={`board-${route.params.boardId}`} boardId={route.params.boardId} />,
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
        initialLat={route.params.lat}
        initialLon={route.params.lon}
      />
    ),
    course: <CoursePage key={`course-${route.params.boardId}`} boardId={route.params.boardId} />,
    profile: (
      <ProfilePage
        key={`profile-${route.params.boardId}`}
        boardId={route.params.boardId}
      />
    ),
  };

  const page = routes[route.route] || <NotFound />;
  return isServerBoardRoute
    ? <ServerBoardProvider key={route.params.boardId} boardId={route.params.boardId}>{page}</ServerBoardProvider>
    : page;
}

export default function App() {
  const { route } = useHashRouter();
  const { route: routeName, params } = route;
  const { boardId, placeId, code } = params;

  useEffect(() => {
    document.title = titleForRoute({ route: routeName });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [routeName, boardId, placeId, code]);

  return <div className="relative mx-auto flex min-h-screen w-full flex-col bg-bg">
    <AppContent route={route} />
    <Toast />
  </div>;
}

function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(150deg,#eaf8ff,#fffdf3)] px-5 text-center"><section className="w-full max-w-sm rounded-[28px] border border-white bg-white/85 p-7 shadow-[0_18px_45px_rgba(40,90,130,.12)]"><Brand className="justify-center" /><p className="mt-8 text-sm font-black tracking-[.14em] text-coral">404</p><h1 className="mt-2 text-2xl font-black">페이지를 찾을 수 없어요</h1><p className="mt-3 text-sm leading-6 text-ink-2">주소가 바뀌었거나 더 이상 사용할 수 없는 페이지예요.</p><Button className="mt-6" onClick={() => navigate("/")}>홈으로</Button></section></main>;
}
