import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Heading, PhrasingContent, Root } from "mdast";

/** 마크다운 인라인 표식을 목차 라벨에서 제거 (표시용) */
export function stripInlineMdForToc(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export type MarkdownTocItem = {
  depth: 1 | 2 | 3;
  text: string;
  /** MarkdownContent에서 h1~h3에 부여하는 id와 동일한 순번 */
  id: string;
};

function plainFromPhrasing(nodes: PhrasingContent[]): string {
  let out = "";
  for (const n of nodes) {
    if (n.type === "text") out += n.value;
    else if (n.type === "inlineCode") out += n.value;
    else if ("children" in n && Array.isArray(n.children))
      out += plainFromPhrasing(n.children as PhrasingContent[]);
  }
  return out;
}

/**
 * `#`~`###`에 해당하는 heading 노드를 remark(+GFM)로 추출해 목차로 씁니다.
 * (줄 단위 정규식보다 본문 렌더와 동일하게 인용·들여쓰기 등을 반영합니다.)
 * id는 MarkdownContent의 `md-heading-0`, … 순번과 맞춥니다(깊이 1~3만 포함).
 */
export function parseMarkdownToc(md: string): MarkdownTocItem[] {
  if (!md || !md.trim()) return [];
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md) as Root;
  const items: MarkdownTocItem[] = [];
  let n = 0;
  visit(tree, "heading", (node: Heading) => {
    if (node.depth > 3) return;
    const raw = plainFromPhrasing(node.children).trim();
    const text = stripInlineMdForToc(raw);
    if (!text) return;
    items.push({
      depth: node.depth as 1 | 2 | 3,
      text,
      id: `md-heading-${n}`,
    });
    n++;
  });
  return items;
}
