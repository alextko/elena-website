"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// Strip trailing incomplete markdown syntax so a partial streamed prefix
// never flashes raw `**` or `[text](htt` on screen.
export function stripTrailingIncomplete(text: string): string {
  let out = text;
  const boldMarks = [...out.matchAll(/\*\*/g)];
  if (boldMarks.length % 2 === 1) {
    out = out.slice(0, boldMarks[boldMarks.length - 1].index);
  }
  const openBracket = out.lastIndexOf("[");
  if (openBracket !== -1) {
    const tail = out.slice(openBracket);
    if (!/^\[[^\]]*\]\([^)]*\)/.test(tail)) {
      out = out.slice(0, openBracket);
    }
  }
  return out;
}

const MARKDOWN_COMPONENTS = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#2E6BB5] underline underline-offset-2"
    >
      {children}
    </a>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-1 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-1 list-disc pl-5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-1 list-decimal pl-5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="mb-0.5">{children}</li>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-bold mt-3 mb-2">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-[0.95rem] font-semibold mt-2 mb-1">{children}</h4>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-[#0F1B3D]/20 pl-3 my-2 text-[#0F1B3D]/70 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-t border-[#0F1B3D]/15" />,
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    // When a block ```fenced``` has no language, react-markdown emits
    // <code> with no className. When it has one, className like "language-x".
    // Inline code lacks className entirely AND is not inside a <pre>.
    const isBlock = className?.startsWith("language-") ?? false;
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-[#0F1B3D]/[0.06] px-1 py-0.5 text-[0.85em] font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-2 overflow-x-auto rounded bg-[#0F1B3D]/[0.04] p-3 text-[0.85em] font-mono leading-snug">
      {children}
    </pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-[0.9em]">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-[#0F1B3D]/[0.04]">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-[#0F1B3D]/15 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-[#0F1B3D]/15 px-2 py-1">{children}</td>
  ),
};

const MARKDOWN_PLUGINS = [remarkGfm, remarkBreaks];

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS} components={MARKDOWN_COMPONENTS}>
      {content}
    </ReactMarkdown>
  );
}
