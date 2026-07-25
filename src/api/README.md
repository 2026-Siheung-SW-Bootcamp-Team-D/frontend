공용 Axios 클라이언트와 API 도메인 모듈을 둡니다.

- `client.js`: Base URL 검증, 보드별 Bearer 토큰 주입, 401 세션 정리
- `errors.js`: 화면에 노출해도 안전한 공통 오류 객체
- `session.js`: `yeondang.participantSessions.v1`의 보드별 참여 세션 저장
- `boards.js`: 보드·초대·참여자 API 함수

`VITE_API_BASE_URL`은 `/api/v1`까지 포함합니다. 이 폴더의 API 경로에는
`/api/v1`을 다시 넣지 않습니다.
