import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

/**
 * Resolve image src to file:// URL for epub-gen-memory to embed.
 * Handles relative paths (resolved from page dir), absolute paths, and remote URLs.
 */
export function resolveImageSrc(
  src: string,
  pageDir: string,
  publicDir: string,
): string | undefined {
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

  // Absolute path starting with / - could be from public dir
  if (src.startsWith('/')) {
    const resolved = path.join(publicDir, src.slice(1));
    if (fs.existsSync(resolved)) return pathToFileURL(resolved).href;
  }
  // Relative path or others - resolve from page directory
  const resolved = path.resolve(pageDir, src);
  if (fs.existsSync(resolved)) return pathToFileURL(resolved).href;
}
