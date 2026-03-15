# 문제 원인 정리: 강의 자료 미리보기 / finalDocument 표시

## 1. 발생했던 현상

- **콘솔 오류**: `Access to fetch at 'https://uouaitutor.duckdns.org/###%201.%20%EC%9E%90%EB%A3%8C...'` + CORS / `GET ... net::ERR_FAILED`
- **화면**: 백엔드가 내려준 문서 내용(finalDocument)이 화면에 안 뜸. DevTools에서는 응답에 본문이 보임.

---

## 2. 원인 (프론트엔드 측)

### 2-1. 마크다운 본문을 URL처럼 써서 fetch 시도

- **원인**: `finalDocument`(마크다운 문자열)를 “문서 URL”로 오인하고, 그대로 또는 `baseUrl + finalDocument` 형태로 `fetch(url)`에 넘김.
- **경로 예**:
  - latest-session 응답에서 `docUrl = raw.finalDocument`로 두고, 목록 추가 조건만 쓰다가 **다른 경로**에서 이 값이 URL처럼 쓰일 수 있었음.
  - 또는 **getCourseContents**의 `materials[].url`에 백엔드가 `finalDocument` 본문이나 `https://도메인/###%20...` 같은 “도메인+마크다운” 문자열을 넣어주면, 프론트는 `fileUrl: m.url`로 저장 후 카드 클릭 시 `setPreviewFileUrl(item.fileUrl)` → 해당 문자열로 **fetch** 시도.
- **결과**: `https://uouaitutor.duckdns.org/###%201.%20...` 같은 비정상 URL로 GET 요청 → CORS/404/ERR_FAILED.

### 2-2. “화면에 띄울 값”을 finalDocument가 아닌 다른 값으로 사용

- **원인**: 문서 본문 표시용으로 `finalDocument`를 쓰지 않고, `draftPlan`, `documentUrl`, 또는 `url`/`fileUrl`만 사용.
- **예**:
  - latest-session 보완 시 `docUrl`에 `raw.finalDocument`를 넣어 “URL”로 취급.
  - Phase 5 / 최근 기획안 불러오기에서 `res.finalDocument`를 URL로 해석해 `setMaterialFinalUrl(res.finalDocument)` 등으로 설정.
- **결과**: 표시용 상태에 마크다운 문자열이 안 들어가서, 마크다운 렌더러에 넘어갈 값이 없음 → 화면에 안 뜸.

### 2-3. URL 파싱 이슈로 “마크다운인지” 판별 실패

- **원인**: `https://도메인/###%201.%20...` 형태에서 `#`가 URL fragment로 파싱되어 `new URL(...).pathname`이 `"/"`만 반환됨.
- **결과**: “path가 마크다운 같다”는 기존 검사(path 길이, 패턴)가 동작하지 않아, 잘못된 URL인데도 fetch를 시도함.

### 2-4. 모달에서 문서 본문을 렌더하지 않음

- **원인**: Step 5에서 `materialFinalUrl`만 있고, 그걸 “문서 보기/다운로드” **링크**로만 사용. `finalDocument` 문자열을 받아서 모달 안에서 `<ReactMarkdown>`으로 그리는 경로가 없음.
- **결과**: 최근 기획안 불러오기나 Phase 5 완료 후 모달에서 문서 내용이 안 보임.

---

## 3. 적용한 수정 요약

| 구분 | 수정 내용 |
|------|-----------|
| **표시 값 통일** | 화면에 띄울 문서 본문은 **오직 `finalDocument`**만 사용. `documentUrl`/`url`은 다운로드·링크용으로만 사용. |
| **목록 아이템** | latest-session 보완 시 `finalDocument`를 URL로 쓰지 않고, `CenterItem.finalDocument`에만 저장. `docUrl`에는 실제 URL만 사용. |
| **카드 클릭** | `item.finalDocument`가 있으면 그 문자열만 `setPreviewFileUrl`에 넣어, fetch 없이 마크다운으로만 렌더. |
| **fetch 방어** | `previewFileUrl`이 `###`, `## `, 한글 인코딩, 길이 400자 초과 등 “마크다운 같다”는 패턴이면 fetch 하지 않고, 디코딩한 뒤 `setPreviewMarkdownContent`로만 표시. |
| **Phase 5 / 최근 기획안** | `res.finalDocument`가 있으면 `setMaterialFinalDocument(res.finalDocument)`로 두고, 모달 Step 5에서 `<ReactMarkdown>{materialFinalDocument}</ReactMarkdown>`으로 렌더. |
| **문서 영역 노출** | Step 5에서 “문서 있음” 조건을 `materialFinalDocument != null || materialFinalUrl != null`로 해서, `finalDocument`만 있어도 문서 영역이 보이도록 함. |

---

## 4. 한 줄 정리

- **원인**: 프론트에서 `finalDocument`(마크다운 본문)를 URL로 쓰고 fetch했고, 표시용으로는 `finalDocument`를 마크다운 렌더러에 넘기지 않았음.
- **해결**: 표시는 **항상 `finalDocument`만** 쓰고, 그 값만 마크다운 렌더러에 연결. URL 형태로 쓰는 값은 실제 문서 URL만 사용하고, “마크다운 같다”고 보이는 값은 fetch하지 않도록 방어 로직 추가.
