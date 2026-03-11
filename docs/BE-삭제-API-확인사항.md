# 강의 리소스 삭제 API 확인 요청 (BE)

프론트에서 아래 API를 호출한 뒤 목록을 다시 불러오면 삭제된 항목이 그대로 남아 있습니다.  
**실제 DB/스토리지 삭제가 이루어지는지** 확인 부탁드립니다.

---

## 1. 강의 자료 삭제

- **엔드포인트:** `DELETE /api/materials/{materialId}`
- **동작:** 특정 강의 자료(materialId) 삭제
- **확인 요청:**
  - 이 API 호출 시 해당 `materialId` 자료가 DB/스토리지에서 **실제로 삭제**되는지
  - 삭제 후 `GET /api/courses/{courseId}/contents` 응답에 해당 자료가 **더 이상 포함되지 않는지**

---

## 2. 강의자료 생성 세션 전체 삭제 (Phase 1~5)

- **엔드포인트:** `DELETE /api/materials/generation/{sessionId}`
- **동작:** 해당 `sessionId`의 생성 세션 전체(Phase 1~5) 삭제, 해당 강의 소유 교사만 가능
- **확인 요청:**
  - 호출 시 세션 및 연관 데이터가 **실제로 삭제**되는지
  - 삭제 후 contents/목록 API에 해당 세션 결과가 **더 이상 노출되지 않는지**

---

## 3. Phase 5 최종 문서만 삭제 (선택)

- **엔드포인트:** `DELETE /api/materials/generation/{sessionId}/document`
- **동작:** 해당 세션의 Phase 5 산출물(최종 문서)만 삭제, 세션은 유지
- **확인 요청:** 위와 동일하게, 문서 삭제 후 목록/다운로드에서 **반영되는지**

---

## 프론트 동작 요약

- 삭제 시 `DELETE /api/materials/{materialId}` 또는 `DELETE /api/materials/generation/{sessionId}` 호출
- 호출 성공(2xx) 후 `GET /api/courses/{courseId}/contents`로 목록 재조회
- 재조회 결과에 삭제한 항목이 그대로 포함됨 → **BE에서 삭제가 반영되지 않는 것으로 추정**

결론: **DELETE 처리 후 DB/파일 삭제 및 contents API 응답에서 제외가 되도록 BE 구현/트랜잭션 확인 필요.**

---

# 강의자료 생성 Phase 2 호출 400 에러 (BE)

## 현상

- 프론트: **최근 사용한 기획안 불러오기** → `GET /api/materials/generation/lectures/{lectureId}/latest-session` 호출
- 응답으로 `sessionId`, `draftPlan`, `currentPhase`(PHASE1/PHASE2) 수신 후 기획안 확정/수정 요청 화면(Step 2) 표시
- 사용자가 **기획안 확정** 또는 **수정 요청** 클릭 시  
  `POST /api/materials/generation/phase2` (`sessionId`, `action: "confirm"` 또는 `"feedback"`) 호출
- BE 응답: **400 Bad Request**  
  메시지: `Phase 2는 Phase 1 완료 후에만 진행할 수 있습니다.`

## 요청 사항

- **latest-session**으로 조회된 세션(`sessionId`)에 대해  
  `currentPhase`가 PHASE1 또는 PHASE2이고 `draftPlan`이 있는 경우,  
  **Phase 2(확정/수정 요청) 호출을 허용**해 주세요.
- 또는 위 조건의 세션을 “Phase 1 완료” 상태로 간주하거나,  
  Phase 2 허용을 위한 별도 상태 갱신(또는 복구) 로직을 BE에서 지원해 주세요.

## 정리

- **목적:** “최근 기획안 불러오기” 후 같은 세션으로 기획안 확정/수정이 가능해야 함.
- **핵심:** latest-session으로 내려준 `sessionId`에 대해 Phase 2 API가 400 없이 동작하도록 BE 상태/검증 수정 필요.
