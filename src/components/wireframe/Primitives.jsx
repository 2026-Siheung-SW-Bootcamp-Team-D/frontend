/*
 * 와이어프레임 전용 UI 프리미티브.
 *
 * 실제 제품 컴포넌트가 아니다. 학생이 "어떤 화면에서 무엇을 누르면 어디로 가는가"를
 * 직접 클릭해 보게 만드는 것이 목적이라, 이동만 동작하고 나머지 상태 변화는 넣지 않았다.
 *
 * `to`가 있으면 `<a href="#/경로">`로 렌더한다. 해시 링크라서 별도 JS 없이
 * 브라우저의 뒤로가기·앞으로가기가 그대로 동작한다.
 *
 * Tailwind v4에서는 클래스명을 문자열로 조합하면 빌드 스캔에서 빠지므로,
 * 변형은 완성된 클래스명 lookup 테이블에서 고른다.
 */

const SHELL_TONE = {
  app: 'bg-neutral-100',
  public: 'bg-slate-200',
}

/**
 * 화면 한 장 = 페이지 하나.
 * backTo가 있으면 상단에 뒤로 가기 링크를 놓는다.
 */
export function PageShell({ id, title, backTo, tone = 'app', note, children }) {
  return (
    <div className={`min-h-screen ${SHELL_TONE[tone]} px-4 py-5`}>
      <div className="mx-auto w-full max-w-[400px]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {backTo ? (
              <a
                href={`#${backTo}`}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[12px] text-neutral-700 no-underline"
              >
                ←
              </a>
            ) : null}
            <span className="text-[12px] font-semibold text-neutral-800">
              {id}
            </span>
            <span className="truncate text-[12px] text-neutral-500">
              {title}
            </span>
          </div>
          <a
            href="#/_index"
            className="shrink-0 text-[11px] text-neutral-500 underline"
          >
            화면 목록
          </a>
        </div>

        <div className="flex min-h-[560px] flex-col gap-3 rounded-xl border border-neutral-300 bg-white px-4 pt-5 pb-6">
          {children}
        </div>

        {note ? (
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function Title({ children }) {
  return (
    <h1 className="text-[18px] leading-tight font-semibold text-neutral-900">
      {children}
    </h1>
  )
}

export function SubTitle({ children }) {
  return <p className="text-[15px] font-semibold text-neutral-900">{children}</p>
}

export function Sub({ children }) {
  return <p className="text-[12px] text-neutral-500">{children}</p>
}

export function Label({ children }) {
  return <p className="text-[12px] font-semibold text-neutral-800">{children}</p>
}

const NOTE_TONE = {
  muted: 'text-neutral-400',
  accent: 'text-blue-600',
}

/** 화면이 지켜야 하는 명세 규칙. tone="accent"는 PoC 실측으로 확정된 규칙. */
export function Note({ children, tone = 'muted' }) {
  return (
    <p className={`text-[10px] leading-relaxed ${NOTE_TONE[tone]}`}>
      {children}
    </p>
  )
}

export function Row({ children }) {
  return <div className="flex items-center gap-2">{children}</div>
}

const PLACEHOLDER_SIZE = {
  input: 'h-11',
  sm: 'h-24',
  md: 'h-32',
  lg: 'h-40',
  xl: 'h-48',
}

/** 지도·차트·입력창처럼 실제 구현이 들어갈 자리. */
export function Placeholder({ children, size = 'input', grow = false }) {
  return (
    <div
      className={`flex items-center rounded-md bg-neutral-200 px-3 text-[11px] text-neutral-500 ${PLACEHOLDER_SIZE[size]} ${grow ? 'flex-1' : ''}`}
    >
      {children}
    </div>
  )
}

const BUTTON_VARIANT = {
  primary: 'bg-neutral-800 text-white',
  secondary: 'border border-neutral-800 bg-white text-neutral-800',
  ghost: 'border border-neutral-300 bg-white text-neutral-500',
}

const BUTTON_BASE =
  'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-center text-[13px] font-semibold no-underline'

/** to가 있으면 링크, 없으면 아무 동작 없는 버튼. */
export function Button({ children, to, variant = 'secondary', full = false }) {
  const className = `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${full ? 'w-full' : ''}`
  if (to) {
    return (
      <a href={`#${to}`} className={className}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={className}>
      {children}
    </button>
  )
}

const CHIP_STATE = {
  on: 'bg-neutral-800 font-semibold text-white',
  off: 'bg-neutral-100 text-neutral-700',
}

export function Chip({ children, active = false, to }) {
  const className = `inline-block rounded-full px-3 py-1.5 text-[11px] no-underline ${active ? CHIP_STATE.on : CHIP_STATE.off}`
  if (to) {
    return (
      <a href={`#${to}`} className={className}>
        {children}
      </a>
    )
  }
  return <span className={className}>{children}</span>
}

/** 장소·후보·댓글 목록 항목. to가 있으면 카드 전체가 링크가 된다. */
export function ListCard({ title, meta, to, highlight = false }) {
  const className = `block rounded-lg px-3 py-2.5 no-underline ${highlight ? 'bg-blue-50' : 'bg-neutral-100'}`
  const body = (
    <>
      <p className="text-[13px] font-semibold text-neutral-900">{title}</p>
      {meta ? <p className="mt-1 text-[11px] text-neutral-500">{meta}</p> : null}
    </>
  )
  if (to) {
    return (
      <a href={`#${to}`} className={className}>
        {body}
      </a>
    )
  }
  return <div className={className}>{body}</div>
}

export function Field({ label, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Placeholder>{placeholder}</Placeholder>
    </div>
  )
}

const BOARD_TABS = [
  { name: '장소 보드', to: '/boards/1' },
  { name: '코스', to: '/boards/1/course' },
  { name: '결정', to: '/boards/1/decide' },
]

/** 보드 상세의 상단 탭. 실제로 탭 간 이동이 된다. 기능명세 §4.1 */
export function TabBar({ active }) {
  return (
    <div className="flex gap-2">
      {BOARD_TABS.map((tab) => (
        <Chip key={tab.name} active={tab.name === active} to={tab.to}>
          {tab.name}
        </Chip>
      ))}
    </div>
  )
}

/** 코스 구간 사이의 이동 추정 표시. BR-007·BR-008 */
export function LegHint({ children }) {
  return <p className="text-[10px] text-neutral-400">↓ {children}</p>
}

/** 이 화면에서 어디로 이어지는지 알려 주는 안내. */
export function FlowHint({ children }) {
  return (
    <p className="text-[10px] leading-relaxed text-emerald-700">→ {children}</p>
  )
}
