export function formatKoreanDateTime(value: string | number | Date | undefined | null): string {
  if (value == null || String(value).trim() === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const period = date.getHours() < 12 ? "오전" : "오후";
  const hour12 = date.getHours() % 12 || 12;
  const minute = date.getMinutes();

  return `${year}년 ${month}월 ${day}일 ${period} ${hour12}시 ${minute}분`;
}
