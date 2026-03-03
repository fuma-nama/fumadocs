import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Resolve image src to file:// URL for epub-gen-memory to embed.
 * Handles relative paths (resolved from page dir), absolute paths, and remote URLs.
 */
export function resolveImageSrc(
  src: string,
  pageDir: string,
  publicDir?: string,
): string {
  // Already a file:// URL
  if (src.startsWith('file://')) {
    return src;
  }

  // Remote URL - epub-gen-memory can fetch these
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Data URL - pass through
  if (src.startsWith('data:')) {
    return src;
  }

  // Protocol-relative URL (//cdn.example.com/...) - normalize to https:
  if (src.startsWith('//')) {
    return `https:${src}`;
  }

  // Relative path - resolve from page directory
  if (src.startsWith('./') || src.startsWith('../') || !src.startsWith('/')) {
    const resolved = path.resolve(pageDir, src);
    return pathToFileUrl(resolved);
  }

  // Absolute path starting with / - could be from public dir
  if (publicDir && src.startsWith('/')) {
    const resolved = path.join(publicDir, src.slice(1));
    return pathToFileUrl(resolved);
  }

  // Fallback: resolve from page dir
  const resolved = path.resolve(pageDir, src);
  return pathToFileUrl(resolved);
}

/**
 * Transform HTML content to replace image src attributes with file:// URLs.
 */
export function resolveImagesInHtml(
  html: string,
  pageDir: string,
  publicDir?: string,
): string {
  return html.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      const resolved = resolveImageSrc(src, pageDir, publicDir);
      return `<img${before}src="${resolved}"${after}>`;
    },
  );
}

function pathToFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}
