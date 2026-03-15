# 강의자료 생성·미리보기 API — 백엔드 요청 사항

프론트엔드에서 강의자료 생성 및 AI 생성 자료 미리보기가 정상 동작하도록, 아래 API/데이터 형식을 맞춰 주시면 됩니다.

---

## 1. latest-session 404

**현상**  
`GET /api/materials/generation/lectures/{lectureId}/latest-session` 호출 시 **404** 발생 (예: `lectureId=22`).

**요청**  
- 해당 강의에 **한 번도 생성 세션이 없는 경우**에는 404 대신 **빈 body 또는 `sessionId: null` 등으로 200**을 내려주거나,  
- **404일 때 프론트에서 무시해도 되는 명세**라면 “404 = 세션 없음”으로 문서화해 주세요.  
- 실제로 세션이 있어야 하는데 404가 난다면, 경로(`/lectures/22/latest-session`) 및 해당 강의의 세션 존재 여부를 백엔드에서 확인 부탁드립니다.

---

## 2. 자료 URL에 마크다운 본문이 들어가는 문제 (중요)

**현상**  
- 강의 콘텐츠/자료 목록을 내려줄 때, AI 생성 자료의 **`url`(또는 `fileUrl`) 필드에 “문서 URL”이 아니라 **마크다운 본문 전체**(`finalDocument` 내용)가 문자열로 들어옵니다.
- 프론트는 이 값을 “파일 주소”로 인식하고 `fetch(url)`를 시도하다가, URL이 `https://도메인/###%201.%20자료구조의...` 형태로 비정상적으로 길어져 **요청 실패**(net::ERR_FAILED)가 발생했습니다.

**요청**  
AI 생성 자료를 목록에 넣을 때는 반드시 **문서 조회용 URL**만 내려주세요.

- **권장**: 문서 본문이 아닌 **API 경로**를 내려주기  
  - 예: `url` = `"/api/materials/generation/{sessionId}/document"`  
  - 또는 절대 URL: `"https://{host}/api/materials/generation/{sessionId}/document"`
- **금지**: `url`에 `finalDocument`(마크다운 본문 문자열)를 그대로 넣지 말 것.

**참고**  
- 프론트는 현재, `url`이 `http://`/`https://`/`/`로 시작하지 않으면 “URL이 아니라 마크다운 본문”으로 간주하고 fetch 없이 바로 렌더링하도록 우회 처리해 두었습니다.
- 하지만 목록/저장 데이터에는 **항상 문서 URL만** 들어가도록 백엔드에서 수정하는 것이 맞습니다.

---

## 3. API 정리 (강의자료 생성·미리보기)

프론트가 사용하는 흐름 기준으로 정리합니다.

| 용도 | 메서드 | URL | 비고 |
|------|--------|-----|------|
| 최근 세션 조회 | GET | `/api/materials/generation/lectures/{lectureId}/latest-session` | 세션 없을 때 404 대신 200+빈/null 처리 또는 문서화 |
| 세션 상태·문서 내용 | GET | `/api/materials/generation/{sessionId}/status` | `currentPhase`, `progressPercentage`, `finalDocument` 등 |
| 문서 본문(다운로드/미리보기) | GET | `/api/materials/generation/{sessionId}/document` | **Content-Type: text/markdown**, 본문만 반환 |
| Phase 1~5 | POST | `/api/materials/generation/phase1` ~ `phase5` | 기존 스펙 유지 |
| Phase 3~5 비동기 실행 | POST | `/api/materials/generation/async` | body: `{ sessionId }`, 응답: `taskId` 등 |
| 작업 상태 폴링 | GET | `/api/tasks/{taskId}/status` | Phase 3~5 비동기 진행 상태 |

- **자료 목록**에 AI 생성 자료를 넣을 때: 위 **document URL** (`/api/materials/generation/{sessionId}/document`) 또는 동일한 문서를 반환하는 URL을 `url` 필드에 넣어 주세요.  
- **`url`에는 마크다운 본문(`finalDocument`)을 넣지 말 것** (2번과 동일).

---

## 4. 요약

- **latest-session**: 404 원인 확인 또는 “세션 없음일 때 200/빈 응답” 등 명세 정리.
- **자료 목록의 `url`**: AI 생성 자료는 **문서 URL만** 내려주고, **마크다운 본문을 `url`에 넣지 말 것**.

이렇게 맞춰 주시면 프론트에서도 목록·미리보기·다운로드가 안정적으로 동작합니다.
