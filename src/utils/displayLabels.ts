const GENERIC_CODE_LABELS: Record<string, string> = {
  ACTIVE: "사용 중",
  INACTIVE: "사용 안 함",
  ENABLED: "사용",
  DISABLED: "사용 안 함",
  NONE: "없음",
  UNKNOWN: "확인 필요",
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  VERY_HIGH: "매우 높음",
  INSUFFICIENT_DATA: "데이터 부족",
  INSUFFICIENT_EVIDENCE: "근거 부족",
  NO_EVIDENCE: "근거 없음",
  NEEDS_ATTENTION: "주의 필요",
  ON_TRACK: "정상",
  EXCELLING: "우수",
};

const FALLBACK_POLICY_LABELS: Record<string, string> = {
  INSUFFICIENT_EVIDENCE: "근거가 부족하면 데이터 부족으로 표시",
  INSUFFICIENT_DATA: "데이터가 부족하면 판단 보류",
  LOW_CONFIDENCE: "신뢰도가 낮으면 판단 보류",
  USE_DEFAULT: "기본 기준으로 보완",
  NONE: "별도 보완 정책 없음",
};

const DATA_SOURCE_HINT_LABELS: Record<string, string> = {
  QUESTION_LOG: "질문 기록",
  CHAT_LOG: "채팅 기록",
  QUIZ_SCORE: "퀴즈 점수",
  QUIZ_RESULT: "퀴즈 결과",
  EXAM_RESULT: "시험 결과",
  SUBMISSION: "제출 기록",
  PAGE_COVERAGE: "페이지 학습 기록",
  LEARNING_EVIDENCE: "통합학습 근거",
  SESSION_MEMO: "세션 메모",
  ATTENDANCE: "출석 기록",
  ACTIVITY_SUMMARY: "활동 요약",
};

const CRITERIA_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "반영 중",
  INACTIVE: "반영 안 함",
  NONE: "추가 기준 없음",
  EMPTY: "추가 기준 없음",
  READY: "반영 준비 완료",
  PENDING: "반영 대기",
};

const COMPETENCY_LEVEL_LABELS: Record<string, string> = {
  EXCELLENT: "매우 우수",
  GOOD: "양호",
  FAIR: "보통",
  BASIC: "기초",
  WEAK: "보완 필요",
  NEEDS_ATTENTION: "주의 필요",
  INSUFFICIENT_DATA: "데이터 부족",
  MAINTAIN: "유지",
  IMPROVING: "향상 중",
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  LOW: "안정",
  MEDIUM: "관찰 필요",
  HIGH: "우선 보완",
  CRITICAL: "긴급 보완",
  NONE: "위험 없음",
};

function normalizeCode(value: string | undefined | null): string {
  return String(value ?? "").trim();
}

function fallbackHumanize(value: string): string {
  const normalized = normalizeCode(value);
  if (!normalized) return "-";
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function formatBackendCodeLabel(
  value: string | undefined | null,
  labels: Record<string, string> = {},
  fallback = "-",
): string {
  const raw = normalizeCode(value);
  if (!raw) return fallback;
  const upper = raw.toUpperCase();
  return labels[upper] ?? GENERIC_CODE_LABELS[upper] ?? fallbackHumanize(raw);
}

export function formatFallbackPolicyLabel(value: string | undefined | null): string {
  return formatBackendCodeLabel(value, FALLBACK_POLICY_LABELS);
}

export function formatDataSourceHintLabel(value: string | undefined | null): string {
  return formatBackendCodeLabel(value, DATA_SOURCE_HINT_LABELS);
}

export function formatCriteriaStatusLabel(value: string | undefined | null): string {
  return formatBackendCodeLabel(value, CRITERIA_STATUS_LABELS, "적용 중");
}

export function formatCompetencyLevelLabel(value: string | undefined | null): string {
  return formatBackendCodeLabel(value, COMPETENCY_LEVEL_LABELS);
}

export function formatConfidenceLabel(value: string | undefined | null): string {
  return formatBackendCodeLabel(value);
}

export function formatRiskLevelLabel(value: string | undefined | null): string {
  return formatBackendCodeLabel(value, RISK_LEVEL_LABELS);
}
