/**
 * 로그인 후 복귀 URL. 강의실 상세(/courses/:courseId)는 재로그인 시 항상 강의 목록(/)으로 보냅니다.
 */
export function sanitizePostLoginNext(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "/";
  const trimmed = String(raw).trim();
  if (!trimmed.startsWith("/")) return "/";

  try {
    const fakeBase = "http://local.invalid";
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(trimmed, fakeBase);
    const path = url.pathname;
    if (/^\/courses\/\d+(\/.*)?$/.test(path)) {
      return "/";
    }
    const rel = `${path}${url.search}${url.hash}`;
    return rel || "/";
  } catch {
    return "/";
  }
}
