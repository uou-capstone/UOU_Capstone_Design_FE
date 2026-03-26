import { visitParents } from "unist-util-visit-parents";
import type { Element, ElementContent, Root, Text } from "hast";

const equalsHighlightRe = /==([^=\n]+)==/g;

/**
 * `==강조==`를 sanitize 통과 가능한 `<mark class="md-key">`로 바꿉니다.
 * 마크다운 파싱 이후에 적용하므로 같은 문단의 `**볼드**`, `` `코드` `` 와 함께 동작합니다.
 */
export function rehypeMarkEqualsHighlight() {
  return (tree: Root) => {
    const ops: Array<{
      parent: Element;
      index: number;
      fragments: ElementContent[];
    }> = [];

    visitParents(tree, (node, ancestors) => {
      if (node.type !== "text") return;
      const textNode = node as Text;
      const value = textNode.value;
      if (!value.includes("==")) return;
      if (
        ancestors.some(
          (a) =>
            a.type === "element" && (a as Element).tagName === "pre",
        )
      ) {
        return;
      }
      const parent = ancestors[ancestors.length - 1] as Element | undefined;
      if (!parent?.children) return;

      equalsHighlightRe.lastIndex = 0;
      if (!equalsHighlightRe.test(value)) return;
      equalsHighlightRe.lastIndex = 0;

      const fragments: ElementContent[] = [];
      let last = 0;
      let matched = false;
      let m: RegExpExecArray | null;
      while ((m = equalsHighlightRe.exec(value)) !== null) {
        matched = true;
        if (m.index > last) {
          fragments.push({ type: "text", value: value.slice(last, m.index) });
        }
        fragments.push({
          type: "element",
          tagName: "mark",
          properties: { className: ["md-key"] },
          children: [{ type: "text", value: m[1] }],
        });
        last = m.index + m[0].length;
      }
      if (!matched) return;
      if (last < value.length) {
        fragments.push({ type: "text", value: value.slice(last) });
      }
      if (fragments.length === 0) return;

      const index = parent.children.indexOf(textNode as ElementContent);
      if (index === -1) return;
      ops.push({ parent, index, fragments });
    });

    const byParent = new Map<Element, typeof ops>();
    for (const op of ops) {
      const list = byParent.get(op.parent);
      if (list) list.push(op);
      else byParent.set(op.parent, [op]);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => b.index - a.index);
      for (const { parent, index, fragments } of list) {
        parent.children.splice(index, 1, ...fragments);
      }
    }
  };
}
