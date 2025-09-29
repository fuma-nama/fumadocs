import type { FormatPreference } from './media-preference';
import type { PreferenceOptions } from './media-preference';
import { pickPreferredFormat } from './media-preference';

export interface MarkdownRedirectOptions {
  markdownExtension?: string;
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
    stripTrailingSlash = true,
  } = input;

  if (!preferred) return null;

  const isMarkdownPath = pathname.endsWith(markdownExtension);

  if (preferred === 'markdown') {
    if (isMarkdownPath) return null;

    const normalizedPath = stripTrailingSlash
      ? removeTrailingSlash(pathname)
      : pathname;

    return `${normalizedPath}${markdownExtension}`;
  }

  return null;
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
