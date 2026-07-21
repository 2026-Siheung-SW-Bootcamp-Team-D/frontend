/*
 * 화면 목록 (`#/_index`).
 *
 * 플로우를 따라가다 길을 잃었을 때 아무 화면으로나 바로 뛸 수 있게 하는 개발용 페이지다.
 * 실제 서비스에는 없는 화면이며, 기능 구현이 시작되면 지운다.
 */

import { FLOW_TITLE, ROUTES } from '../../routes.jsx'

const FLOW_IDS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function ScreenIndex() {
  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-6">
      <div className="mx-auto w-full max-w-[720px]">
        <h1 className="text-[20px] font-semibold text-neutral-900">
          약속 올인원 와이어프레임
        </h1>
        <p className="mt-1 text-[12px] text-neutral-500">
          기능명세서 v1.3 · 화면 {ROUTES.length}장 · 각 화면은 URL을 가진 별도
          페이지입니다
        </p>
        <p className="mt-2 text-[12px] text-neutral-500">
          버튼과 카드를 누르면 다음 화면으로 이동합니다. 이동 외의 동작(입력,
          저장, 지도)은 아직 없습니다.
        </p>

        <a
          href="#/"
          className="mt-4 inline-flex rounded-lg bg-neutral-800 px-4 py-2.5 text-[13px] font-semibold text-white no-underline"
        >
          홈에서 시작하기 →
        </a>

        <div className="mt-6 flex flex-col gap-5">
          {FLOW_IDS.map((flowId) => {
            const screens = ROUTES.filter((route) => route.flow === flowId)
            return (
              <section key={flowId}>
                <h2 className="text-[13px] font-semibold text-neutral-700">
                  FLOW {flowId} · {FLOW_TITLE[flowId]}
                </h2>
                <div className="mt-2 flex flex-col gap-1.5">
                  {screens.map((route) => (
                    <a
                      key={route.path}
                      href={`#${route.path}`}
                      className="flex items-baseline gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 no-underline"
                    >
                      <span className="text-[12px] font-semibold text-neutral-800">
                        {route.id}
                      </span>
                      <span className="text-[13px] text-neutral-700">
                        {route.title}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-neutral-400">
                        #{route.path}
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
