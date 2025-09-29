import type { FormatPreference } from './media-preference';
import type { PreferenceOptions } from './media-preference';
import { pickPreferredFormat } from './media-preference';

export interface MarkdownRedirectOptions {
  markdownExtension?: string;
  minSegments?: number;
  stripTrailingSlash?: boolean;
}

export interface PlanMarkdownRedirectInput extends MarkdownRedirectOptions {
  pathname: string;
  preferred: FormatPreference;
}

export function planMarkdownRedirect(
  input: PlanMarkdownRedirectInput,
): string | null {
  const {
    pathname,
    preferred,
    markdownExtension = '.mdx',
    minSegments = 2,
    stripTrailingSlash = true,
  } = input;

  if (!preferred) return null;

  const segments = extractSegments(pathname);
  const hasSlug = segments.length >= minSegments;
  const isMarkdownPath = pathname.endsWith(markdownExtension);

  if (preferred === 'markdown') {
    if (!hasSlug || isMarkdownPath) return null;

    const normalizedPath = stripTrailingSlash
      ? removeTrailingSlash(pathname)
      : pathname;

    return `${normalizedPath}${markdownExtension}`;
  }

  return null;
}

function extractSegments(pathname: string): string[] {
  return pathname
    .split('/')
    .filter((segment) => segment.length > 0);
}

function removeTrailingSlash(pathname: string): string {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/$/, '');
}

export interface ResolveMarkdownRedirectInput {
  headers: Headers;
  pathname: string;
  preferenceOptions?: PreferenceOptions;
  redirectOptions?: MarkdownRedirectOptions;
}

export function resolveMarkdownRedirect(
  input: ResolveMarkdownRedirectInput,
): string | null {
  const preferred = pickPreferredFormat(input.headers, input.preferenceOptions);
  if (!preferred) return null;

  return planMarkdownRedirect({
    pathname: input.pathname,
    preferred,
    ...input.redirectOptions,
  });
}
