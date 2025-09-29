import type { FormatPreference } from './media-preference';
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
    target,
    sourceBase,
    minSegments = 1,
  } = input;

  if (!preferred) return null;

  const segments = extractSegments(pathname);
  const slugSegments = extractSlug(segments, sourceBase);
  const normalizedTarget = normalizeTarget(target);
  const hasSlug = slugSegments.length >= minSegments;

  if (preferred === 'markdown') {
    if (!hasSlug) return null;

    const slug = slugSegments.join('/');
    return slug.length > 0 ? `${normalizedTarget}/${slug}` : normalizedTarget;
  }

  if (preferred === 'html') return null;

  return null;
}

export interface ResolveMarkdownRedirectInput {
  headers: Headers;
  pathname: string;
  preferenceOptions?: PreferenceOptions;
  redirectOptions: MarkdownRedirectOptions;
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

function extractSegments(pathname: string): string[] {
  return pathname
    .split('/')
    .filter((segment) => segment.length > 0);
}

function extractSlug(segments: string[], sourceBase?: string): string[] {
  if (!sourceBase) return segments;

  const baseSegments = extractSegments(sourceBase);
  const matchesBase = baseSegments.every((segment, index) => segments[index] === segment);
  if (!matchesBase) return segments;

  return segments.slice(baseSegments.length);
}

function normalizeTarget(target: string): string {
  if (!target.startsWith('/')) return `/${target.replace(/^\/+/, '')}`;
  return target.replace(/\/$/, '');
}
