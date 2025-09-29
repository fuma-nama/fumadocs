import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ResolveMarkdownRedirectInput } from '../markdown';
import { resolveMarkdownRedirect } from '../markdown';

export interface CreateMarkdownMiddlewareOptions {
  resolver: Omit<ResolveMarkdownRedirectInput, 'headers' | 'pathname'>;
}

export function createMarkdownMiddleware(
  options: CreateMarkdownMiddlewareOptions,
) {
  return function markdownMiddleware(request: NextRequest) {
    const redirectPath = resolveMarkdownRedirect({
      headers: request.headers,
      pathname: request.nextUrl.pathname,
      ...options.resolver,
    });

    if (!redirectPath) return NextResponse.next();

    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    return NextResponse.redirect(url);
  };
}

