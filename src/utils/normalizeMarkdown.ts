/**
 * AI·에디터가 자주 넣는 비표준 문자·붙어 있는 ** 를 CommonMark에 맞게 보정합니다.
 * (코드 펜스 ``` … ``` 안은 건드리지 않음)
 */

/** 전각 별·역따옴표 등을 ASCII로 */
function normalizeUnicodePunctuation(s: string): string {
  return s
    .replace(/\uFF0A/g, "*") // ＊
    .replace(/\uFF40/g, "`"); // ｀ (fullwidth grave) → 백틱
}

/**
 * `**레이블:**` 직후 다음 볼드가 공백 없이 붙어 `:****`가 되면, 한 덩어리 볼드로만 파싱됨.
 * 예: `**역할:****"무엇"**` → `**역할:** **"무엇"**`
 */
function splitGluedBoldAfterLabel(s: string): string {
  return s.replace(/\*\*([^*\n]+?):\*{4}(?=\S)/g, "**$1:** **");
}

/**
 * LLM·JSON에서 자주 오는 "리터럴 \\n" (백슬래시+n)을 실제 줄바꿈으로 바꿔
 * 리스트/문단이 한 줄로 붙어 나오는 문제를 줄입니다. (펜스 ``` 안에서는 적용 안 함)
 */
function unescapeCommonLiteralEscapes(s: string): string {
  return s
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t");
}

export function normalizeMarkdownInput(md: string): string {
  const parts = md.split(/(```[\s\S]*?```)/g);
  return parts
    .map((chunk) => {
      if (chunk.startsWith("```")) return chunk;
      let s = unescapeCommonLiteralEscapes(chunk);
      s = normalizeUnicodePunctuation(s);
      s = splitGluedBoldAfterLabel(s);
      return s;
    })
    .join("");
}
