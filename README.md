# frontend — 약속 보드 웹 클라이언트

2026 시흥 SW 부트캠프 **Team D**의 웹 화면 저장소입니다.

사용자가 보는 화면을 담당하고, 데이터는 별도의 백엔드 서버에서 받아 옵니다.
화면과 서버를 나눠 만들면 각자 따로 고치고 따로 배포할 수 있습니다.

| | 무엇을 | 어디에 |
|---|---|---|
| **frontend** (여기) | 화면을 그리고 사용자 입력을 받음 | Vercel에 배포 |
| **backend** | 데이터를 저장하고 계산함 | 별도 서버에 배포 |
| **docs** | 기획서와 사전 검증 기록 | [저장소 보기](https://github.com/2026-Siheung-SW-Bootcamp-Team-D/docs) |

무엇을 만드는 서비스인지는 `docs` 저장소의 기능명세서를 먼저 읽어 보세요.

## 기술 스택

| | | |
|---|---|---|
| 언어 | **JavaScript (JSX)** | TypeScript를 쓰지 않습니다 |
| 빌드 도구 | **Vite 8** | 개발 서버와 배포용 빌드를 담당 |
| UI | **React 19** | 화면을 컴포넌트 단위로 조립 |
| 스타일 | **Tailwind CSS v4** | 클래스 이름으로 스타일 지정 |
| 통신 | **axios** | 백엔드에 HTTP 요청 |

---

# 시작하기 (Windows 기준)

## 0단계. 준비물 설치

**PowerShell**을 엽니다. `시작` 버튼 → `powershell` 입력 → 엔터.
검은 창에 명령어를 한 줄씩 치고 엔터를 누르는 방식입니다.

| 프로그램 | 받는 곳 | 주의할 점 |
|---|---|---|
| **Node.js** | <https://nodejs.org/> | `LTS` 버튼으로 받고 계속 `Next` |
| **Git** | <https://git-scm.com/download/win> | 계속 `Next` |

설치 후 확인합니다.

```powershell
node --version
npm --version
git --version
```

버전 번호가 세 줄 나오면 준비 끝입니다.

```
v22.11.0
10.9.0
git version 2.47.1.windows.1
```

> `'node'은(는) 내부 또는 외부 명령... 아닙니다` 가 나오면 **PowerShell을 껐다가 다시 켜 보세요.**
> 설치 직후에는 인식이 안 될 때가 있습니다.

## 1단계. 내려받기

```powershell
cd ~/Documents
git clone https://github.com/2026-Siheung-SW-Bootcamp-Team-D/frontend.git
cd frontend
```

## 2단계. 라이브러리 설치

```powershell
npm install
```

`package.json`에 적힌 라이브러리들을 `node_modules` 폴더로 내려받습니다.
**처음 한 번**, 그리고 `package.json`이 바뀌었을 때만 하면 됩니다. 몇 분 걸립니다.

> `node_modules`는 용량이 크고 언제든 다시 만들 수 있어서 GitHub에 올리지 않습니다.

## 3단계. 서버 주소 설정

```powershell
copy .env.example .env.local
```

`.env.local`이 만들어집니다. 백엔드를 로컬에서 함께 띄운다면 기본값 그대로 두면 됩니다.

> **`.env.local`은 GitHub에 올라가지 않습니다.** 사람마다 값이 다를 수 있고
> 비밀 값이 들어갈 수도 있기 때문입니다.
> 저장소에는 **어떤 변수가 필요한지만 적힌** `.env.example`이 올라갑니다.
>
> ⚠️ `VITE_`로 시작하는 값은 **빌드하면 결과물 파일 안에 그대로 박힙니다.**
> 브라우저 개발자 도구로 누구나 볼 수 있으니 **비밀번호나 API 키를 넣으면 안 됩니다.**
> 비밀이 필요한 일은 백엔드가 대신 처리합니다.

## 4단계. 실행

```powershell
npm run dev
```

`http://localhost:5173` 같은 주소가 나옵니다. `Ctrl` 키를 누른 채 클릭하면 브라우저가 열립니다.

**코드를 고치고 저장하면 브라우저가 알아서 바뀝니다.** 새로고침하지 않아도 됩니다.
서버를 멈추려면 PowerShell에서 `Ctrl + C`.

---

## 자주 쓰는 명령어

| 명령어 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 실행 (코드 고치면 즉시 반영) |
| `npm run lint` | 코드에 문제가 없는지 검사 |
| `npm run build` | 배포용으로 압축·최적화 → `dist` 폴더 생성 |
| `npm run preview` | `build`로 만든 결과물을 실제처럼 확인 |

**코드를 고쳤으면 `npm run lint`를 돌려 보세요.** 오타나 잘못 쓴 문법을 미리 잡아 줍니다.
아무것도 출력되지 않으면 통과입니다.

## 폴더 구조

```
src/
  api/          백엔드와 통신하는 공통 코드
  assets/       코드에서 import 하는 이미지·아이콘
  components/   여러 곳에서 재사용하는 UI 조각 (버튼, 입력창 등)
  features/     기능별 코드 — 대부분의 작업은 여기서
  layouts/      페이지의 공통 틀
  pages/        화면 하나에 해당하는 단위
  styles/       전역 스타일과 색상 등 디자인 값
```

**새 코드를 어디에 둘지 헷갈리면 `features/` 안에 두세요.**
여러 기능에서 같이 쓰게 되면 그때 `components/`로 옮기면 됩니다.

각 폴더 안의 `README.md`에 그 폴더의 역할이 한 줄로 적혀 있습니다.

> `public/` 폴더는 다릅니다. 여기 있는 파일은 가공 없이 그대로 서비스되며
> 주소창에서 `/favicon.svg` 처럼 직접 접근할 수 있습니다.

---

## 배포 (Vercel)

Vercel은 GitHub에 코드를 올리면 **자동으로 빌드해서 인터넷에 띄워 주는 서비스**입니다.

### 최초 1회 설정

1. <https://vercel.com> 접속 → GitHub 계정으로 로그인
2. `Add New...` → `Project` → 이 저장소 선택
3. **빌드 설정은 건드리지 않습니다.** Vercel이 Vite 프로젝트임을 알아서 인식합니다
   (빌드 명령 `npm run build`, 결과물 폴더 `dist`)
4. `Environment Variables`에 배포용 값을 등록합니다

   | Name | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `/api/v1`까지 포함한 배포 API 주소 (예: `https://api.yeondang.com/api/v1`) |
   | `VITE_KAKAO_JAVASCRIPT_KEY` | Kakao Maps JavaScript SDK 공개 키 (REST 키 금지) |

5. `Deploy` 클릭

Kakao 지도를 사용하려면 Kakao Developers의 Web 플랫폼에도 현재 도메인을 등록해야 합니다.
로컬은 `http://localhost:5173`, 운영은 `https://yeondang.com`과
`https://www.yeondang.com`, preview는 승인한 Vercel 도메인만 등록합니다.
키가 없거나 SDK가 차단된 환경에서는 화면이 멈추지 않고 “지도 사용 불가” 안내와 기존 목록·좌표 입력 흐름을 표시합니다.

### 그 다음부터

**GitHub `main` 브랜치에 push하면 자동으로 다시 배포됩니다.** 따로 할 일이 없습니다.

### 배포에서 자주 겪는 문제

| 증상 | 원인과 해결 |
|---|---|
| 화면은 뜨는데 데이터가 안 나옴 | `VITE_API_BASE_URL`이 `localhost`로 되어 있음. 배포된 백엔드 주소로 바꾸세요 |
| 브라우저 콘솔에 `CORS` 오류 | 백엔드가 Vercel 도메인을 허용하지 않음. **백엔드 쪽 설정**을 고쳐야 합니다 |
| 환경변수를 바꿨는데 그대로임 | `VITE_` 값은 **빌드할 때 박힙니다.** Vercel에서 재배포(Redeploy)해야 반영됩니다 |

## 자주 겪는 문제

| 화면에 나온 말 | 원인과 해결 |
|---|---|
| `'npm'은(는) 내부 또는 외부 명령...` | Node.js 미설치 또는 PowerShell 재시작 필요 |
| `Cannot find module ...` | `npm install`을 안 했거나 중간에 실패함. 다시 실행 |
| 포트가 사용 중이라는 메시지 | 개발 서버가 이미 떠 있음. 기존 창에서 `Ctrl + C` |
| 화면이 안 바뀜 | 저장했는지 확인. 그래도 안 되면 서버를 껐다 켜 보세요 |

## macOS · Linux를 쓴다면

명령어 하나만 다릅니다.

| Windows | macOS · Linux |
|---|---|
| `copy .env.example .env.local` | `cp .env.example .env.local` |

---

## 함께 작업할 때

- 커밋 메시지는 한국어로, `type: 설명` 형식으로 씁니다 (예: `feat: 보드 생성 화면 추가`)
- 커밋 전에 `npm run lint`와 `npm run build`를 한 번 돌려 보세요
- `.env.local`, `node_modules`, `dist`는 GitHub에 올리지 않습니다 (`.gitignore`에 등록됨)

AI 코딩 도구를 쓴다면 [AGENTS.md](AGENTS.md)에 이 프로젝트에서 주의할 점이 정리되어 있습니다.
