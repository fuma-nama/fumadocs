import { Fragment, type CSSProperties, type ReactNode } from 'react';

/**
 * Color to apply to highlighted segments.
 * Accepts Tailwind text utilities (e.g. `text-fd-primary`, `text-emerald-500`),
 * arbitrary values (e.g. `text-[var(--token)]`), or raw CSS color like `#10b981`, `red`, `rgb(34,197,94)`.
 */
export type HighlightColor = string;

/**
 * Options for configuring highlight behavior.
 */
export interface HighlightOptions {
  /**
   * Custom regex used to detect matched segments.
   * You may pass a RegExp instance or a string in either raw pattern form or `/pattern/flags` form.
   *
   * @example
   * regex: /\b(api|auth)\b/i
   * @example
   * regex: "\\b(api|auth)\\b"
   * @example
   * regex: "/\\b(api|auth)\\b/i"
   */
  regex?: string | RegExp;

  /**
   * Color for highlighted segments. Accepts a Tailwind class (e.g. `text-emerald-500`),
   * arbitrary Tailwind value (e.g. `text-[var(--token)]`), or any CSS color (e.g. `#10b981`).
   *
   * @defaultValue 'text-fd-primary'
   * @example
   * color: 'text-emerald-500'
   * @example
   * color: '#10b981'
   * @example
   * color: 'var(--fd-primary)'
   */
  color?: HighlightColor;
}

/**
 * Highlight matched query terms inside result text.
 * - `true` enables automatic token-based highlighting from the query
 * - pass an object to customize regex and/or color
 */
export type HighlightMatches = boolean | HighlightOptions;

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseUserRegex(input?: string | RegExp): RegExp | null {
  if (!input) return null;
  try {
    if (input instanceof RegExp) return input;
    const match = input.match(/^\s*\/(.*)\/([gimsuy]*)\s*$/);
    if (match) return new RegExp(match[1], match[2]);
    return new RegExp(input, 'gi');
  } catch {
    return null;
  }
}

export function buildAutoRegexFromQuery(q: string): RegExp | null {
  const trimmed = q.trim();
  if (trimmed.length === 0) return null;
  const terms = Array.from(
    new Set(trimmed.split(/\s+/).map((t) => t.trim()).filter(Boolean)),
  );
  if (terms.length === 0) return null;
  const escaped = terms.map(escapeRegExp).join('|');
  return new RegExp(`(${escaped})`, 'gi');
}

export function resolveHighlightRegex(
  highlight: HighlightMatches,
  query: string,
): RegExp | null {
  if (!highlight) return null;
  if (typeof highlight === 'object') {
    const user = parseUserRegex(highlight.regex);
    if (user) return user;
  }
  return buildAutoRegexFromQuery(query);
}

export function resolveHighlightPresentation(
  highlight: HighlightMatches,
): { className?: string; style?: CSSProperties } {
  if (typeof highlight === 'object' && highlight.color) {
    const c = highlight.color.trim();
    if (/^text-/.test(c)) {
      return { className: c };
    }
    // Fallback to inline style to avoid Tailwind purge issues with arbitrary values
    return { style: { color: c } };
  }
  return { className: 'text-fd-primary' };
}

export function renderHighlighted(
  content: ReactNode,
  regex: RegExp | null,
  presentation: { className?: string; style?: CSSProperties },
): ReactNode {
  if (!regex) return content;
  if (typeof content !== 'string') return content;
  const parts = content.split(regex);
  const exactRegex = new RegExp(
    `^${regex.source}$`,
    regex.flags.replace(/[^i]/g, ''),
  );
  return parts.map((part, index) =>
    exactRegex.test(part) ? (
      <span key={index} className={presentation.className} style={presentation.style}>
        {part}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}


