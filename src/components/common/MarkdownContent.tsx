import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";
import type { Components } from "react-markdown";
import type { Schema } from "hast-util-sanitize";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * `==핵심 내용==` → `<mark class="md-key">` (코드 펜스 ``` … ``` 안은 그대로 둠)
 * AI/작성자가 강조할 문장만 직접 표시할 때 사용.
 */
export function applyHighlightMarkers(md: string): string {
  const parts = md.split(/(```[\s\S]*?```)/g);
  return parts
    .map((chunk) => {
      if (chunk.startsWith("```")) return chunk;
      return chunk.replace(/==([^=\n]+)==/g, (_m, inner: string) => {
        return `<mark class="md-key">${escapeHtml(String(inner))}</mark>`;
      });
    })
    .join("");
}

/** GFM 스키마 + <mark class="md-key">만 허용 (나머지 raw HTML은 제거) */
const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  /** 목차·스크롤 연동을 위해 헤딩 id 유지 (기본은 user-content- 접두사로 변조됨) */
  clobber: defaultSchema.clobber.filter((p) => p !== "id"),
  tagNames: [...defaultSchema.tagNames, "mark"],
  attributes: {
    ...defaultSchema.attributes,
    mark: [["className", "md-key"]],
  },
};

/** 링크·표 등 공통 컴포넌트 (h1~h3는 아래에서 id 부여) */
const markdownBodyComponents: Components = {
  a: ({ href, children, ...props }) => {
    const external =
      typeof href === "string" && /^https?:\/\//i.test(href);
    return (
      <a
        {...props}
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className="font-medium text-emerald-600 underline decoration-emerald-500/35 underline-offset-2 hover:text-emerald-700 hover:decoration-emerald-600/55 dark:text-emerald-400 dark:hover:text-emerald-300"
      />
    );
  },
  img: ({ src, alt, ...props }) => (
    <span className="my-5 block">
      <img
        {...props}
        src={src}
        alt={alt ?? ""}
        className="mx-auto max-h-[min(70vh,720px)] w-auto max-w-full rounded-xl border border-black/10 shadow-sm dark:border-white/10"
        loading="lazy"
        decoding="async"
      />
      {alt?.trim() ? (
        <span className="mt-2 block text-center text-xs opacity-70">{alt}</span>
      ) : null}
    </span>
  ),
  table: ({ children }) => (
    <div className="my-5 w-full overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
      <table className="min-w-full border-collapse align-middle text-sm">
        {children}
      </table>
    </div>
  ),
  hr: () => (
    <hr className="my-10 border-0 border-t border-black/10 dark:border-white/12" />
  ),
};

type MarkdownContentProps = {
  children: string;
};

export function MarkdownContent({ children }: MarkdownContentProps) {
  const source = applyHighlightMarkers(children);
  const headingIdxRef = React.useRef(0);
  headingIdxRef.current = 0;

  const components = React.useMemo((): Components => {
    return {
      ...markdownBodyComponents,
      h1: ({ node: _n, children: c, ...props }) => {
        const id = `md-heading-${headingIdxRef.current++}`;
        return (
          <h1 {...props} id={id}>
            {c}
          </h1>
        );
      },
      h2: ({ node: _n, children: c, ...props }) => {
        const id = `md-heading-${headingIdxRef.current++}`;
        return (
          <h2 {...props} id={id}>
            {c}
          </h2>
        );
      },
      h3: ({ node: _n, children: c, ...props }) => {
        const id = `md-heading-${headingIdxRef.current++}`;
        return (
          <h3 {...props} id={id}>
            {c}
          </h3>
        );
      },
    };
  }, [source]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
      components={components}
    >
      {source}
    </ReactMarkdown>
  );
}
