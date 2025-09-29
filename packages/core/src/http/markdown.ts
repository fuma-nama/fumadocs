import type { PreferenceOptions } from './media-preference';
import { pickPreferredFormat } from './media-preference';

export interface MarkdownRedirectOptions {
  /** Destination prefix when markdown is preferred. */
  target: string;

  /** Optional source prefix to strip before appending slug to `target`. */
  sourceBase?: string;

  /** Minimum slug length required before redirect triggers. */
  minSegments?: number;
}

export interface ResolveMarkdownRedirectInput {
  headers: Headers;
  pathname: string;
  preferenceOptions?: PreferenceOptions;
  redirectOptions: MarkdownRedirectOptions;
}

export function resolveMarkdownRedirect({
  headers,
  pathname,
  preferenceOptions,
  redirectOptions,
}: ResolveMarkdownRedirectInput): string | null {
  const preferred = pickPreferredFormat(headers, preferenceOptions);
  if (preferred !== 'markdown') return null;

  const segments = pathname
    .split('/')
    .filter((segment) => segment.length > 0);

  const baseSegments = redirectOptions.sourceBase
    ? redirectOptions.sourceBase
        .split('/')
        .filter((segment) => segment.length > 0)
    : [];

  const matchesBase = baseSegments.every(
    (segment, index) => segments[index] === segment,
  );
  const slugSegments = matchesBase
    ? segments.slice(baseSegments.length)
    : segments;

  const minSegments = redirectOptions.minSegments ?? 1;
  if (slugSegments.length < minSegments) return null;

  const normalizedTarget = redirectOptions.target.startsWith('/')
    ? redirectOptions.target.replace(/\/$/, '')
    : `/${redirectOptions.target.replace(/^\/+|\/$/g, '')}`;

  if (slugSegments.length === 0) return normalizedTarget;
  return `${normalizedTarget}/${slugSegments.join('/')}`;
}
