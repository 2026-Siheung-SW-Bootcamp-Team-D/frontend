/*
 * 해시 경로에 맞는 화면 하나를 렌더한다.
 *
 * 실제 기능 구현이 시작되면 이 파일이 라우팅·레이아웃 진입점이 된다.
 * (그때 react-router 도입 여부를 따로 합의한다 — AGENTS.md)
 */

import ScreenIndex from './pages/wireframe/ScreenIndex.jsx'
import { ROUTES, SCREEN_INDEX_PATH, useHashPath } from './routes.jsx'

function NotFound({ path }) {
  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-10">
      <div className="mx-auto w-full max-w-[400px] rounded-xl border border-neutral-300 bg-white px-4 py-6">
        <h1 className="text-[16px] font-semibold text-neutral-900">
          없는 화면이에요
        </h1>
        <p className="mt-2 font-mono text-[12px] break-all text-neutral-500">
          #{path}
        </p>
        <a
          href="#/_index"
          className="mt-4 inline-flex rounded-lg bg-neutral-800 px-4 py-2.5 text-[13px] font-semibold text-white no-underline"
        >
          화면 목록으로
        </a>
      </div>
    </div>
  )
}

export default function App() {
  const path = useHashPath()

  if (path === SCREEN_INDEX_PATH) {
    return <ScreenIndex />
  }

  const route = ROUTES.find((item) => item.path === path)
  if (!route) {
    return <NotFound path={path} />
  }

  const { Component } = route
  return <Component />
}
