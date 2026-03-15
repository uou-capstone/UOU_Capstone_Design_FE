# Architectural Workflow 구현 검증

설계 문서(AI-Driven Content Creation Pipeline)와 현재 프론트엔드·API 연동 구현을 단계별로 비교한 결과입니다.

---

## Phase 1: Analysis & Scope

| 설계 | 구현 | 비고 |
|------|------|------|
| **Trigger**: 사용자가 키워드(주제) 입력 | ✅ | Step 1에서 "주제 또는 키워드" 입력 필드 + [기획안 생성] |
| **Keyword Analysis & 의도 파악** | ✅ (백엔드) | `POST /api/materials/generation/phase1` — `keyword`, `lectureId` 전달 |
| **Clarification (Optional)**: LLM 역질문 | ⚠️ **미노출** | Phase 1 응답에 추가 질문이 있어도 **UI에서 표시·답변 입력 플로우 없음**. 백엔드가 `questions` 등 필드로 내려줘도 현재는 `draftPlan`만 렌더링 |
| **Planning**: 초기 계획(Draft Plan) 수립 | ✅ | `phase1` 응답의 `draftPlan` → Step 2에서 `project_meta`, `style_guide`, `chapters` 등 표시 |

**결론**: 키워드 → Draft Plan까지는 설계대로 동작. **역질문(Clarification)** 은 백엔드 스펙이 있으면 프론트에 “질문 표시 + 답변 입력 → phase1 재호출 또는 별도 엔드포인트” 연동이 필요.

---

## Phase 2: Interactive Briefing

| 설계 | 구현 | 비고 |
|------|------|------|
| **Draft Proposal** 제시 | ✅ | Step 2에서 `materialDraftPlan`(프로젝트 개요, 스타일 가이드, 챕터 구성) 표시 |
| **User Review** | ✅ | 사용자가 기획안 확인 후 [기획안 확정] 또는 [수정 요청] 선택 |
| **Interactive Modification**: 수정 요청 → LLM 반영 후 재제시 | ✅ | [수정 요청] 시 텍스트 입력 → `phase2` `action: "feedback"`, `feedback` 전달 → 응답 `updatedPlan`/`draftPlan`으로 화면 갱신 |
| **Confirmation**: 최종 승인까지 반복 | ✅ | [기획안 확정] 시 `phase2` `action: "confirm"` → Step 3으로 진행 |
| **Output**: 확정된 강의 계획서 (Finalized Brief) | ✅ | API 타입에 `finalizedBrief` 포함, 확정 시 백엔드가 세션에 저장 |

**결론**: Phase 2는 설계와 일치. Draft 제시 → 수정 요청(채팅형 피드백) → 재제시 → 확정 플로우 구현됨.

---

## Phase 3: Content Generation (Deep Research)

| 설계 | 구현 | 비고 |
|------|------|------|
| **Input**: 확정된 강의 계획서 | ✅ | 세션에 확정된 Brief 저장됨. `phase3(sessionId)` 호출 시 백엔드가 해당 Brief 사용 |
| **챕터별 글 작성 / Sub-Agent** | ✅ (백엔드) | `POST /api/materials/generation/phase3` — Topic 분해·병렬·검색·집계는 백엔드 책임 |
| **단계별 실행** | ✅ | [Phase 3~5 실행] 없이 단독으로는 Step 3 → Step 4 → Step 5에서 각각 phase3, phase4, phase5 호출 가능 |
| **한 번에 실행 (Async)** | ✅ | `runAsync` + Phase 5 스트리밍으로 “챕터·검증·최종 문서” 한 번에 실행, 실시간 미리보기 |

**결론**: Phase 3 트리거·입출력·비동기·스트리밍까지 설계와 부합. Sub-Agent·Tool-calling·Findings Aggregation은 백엔드 구현 영역.

---

## Phase 4: Review & Verification

| 설계 | 구현 | 비고 |
|------|------|------|
| **Reviewer LLM / 품질 검증** | ✅ (백엔드) | `POST /api/materials/generation/phase4` — 검증 로직은 백엔드 |
| **Pass**: 다음 단계(Phase 5) 진행 | ✅ | phase4 성공 시 Step 5로 이동, [최종 문서 생성] 표시 |
| **Fail**: 재작성·수정 요청 (Feedback Loop) | ⚠️ **백엔드 중심** | phase4 실패 시 프론트는 `alert`만 표시. **Phase 3로 재시도** 또는 **Phase 2로 되돌리기** 버튼은 없음. `rollbackToPhase2` API는 있으나 모달 플로우에 노출되지 않음 |

**결론**: 검증 호출·Pass 시 다음 단계는 구현됨. Fail 시 사용자가 “Phase 2로 돌아가기” 또는 “Phase 3 재실행”을 선택하는 UI가 없음.

---

## Phase 5: Final Assembly

| 설계 | 구현 | 비고 |
|------|------|------|
| **목표**: 검증된 챕터 통합·Markdown 제공 | ✅ | `phase5` 응답 `finalDocument`, `documentUrl` |
| **Consistency / Structure** | ✅ (백엔드) | 수식·제목·계층 구조는 백엔드 포맷팅 |
| **최종 문서 표시·다운로드** | ✅ | [문서 보기/다운로드] 링크, 목록에 추가, `GET .../document`·`.../status` 연동 |
| **실시간 스트리밍** | ✅ | Phase 5 스트림 API로 생성 중 마크다운 실시간 렌더링 |

**결론**: Phase 5는 설계대로 구현됨.

---

## 공통·기타

| 항목 | 구현 |
|------|------|
| Phase 1~5 API 호출 순서·세션 유지 | ✅ `sessionId`로 단계 진행 |
| 최근 기획안 불러오기 | ✅ `getLatestSessionForLecture` → Step 복원 |
| Phase 3~5 비동기 + 스트리밍 | ✅ `runAsync` + `streamPhase(5)` + 폴링 폴백 |
| Phase 5 완료 후 목록 반영 | ✅ `refetchCourseContents`, 로컬 목록에 추가 |

---

## 보완 권장 사항 (설계 완전 충족용)

1. **Phase 1 Clarification (역질문)**  
   - 백엔드가 Phase 1 응답에 “추가 질문” 필드를 주면:  
     - 해당 질문을 UI에 표시하고  
     - 사용자 답변을 받아 phase1 재호출 또는 전용 API로 전달하는 플로우 추가.

2. **Phase 4 Fail 시 피드백 루프**  
   - phase4 실패 시:  
     - “Phase 2로 되돌리기” → `rollbackToPhase2` 호출 후 Step 2로 이동,  
     - 또는 “Phase 3만 다시 실행” 버튼으로 phase3 재호출  
   같은 선택지를 모달에 노출.

위 두 가지를 추가하면 설계 문서의 플로우와 거의 동일하게 맞출 수 있습니다.
