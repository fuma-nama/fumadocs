import { source } from '@/lib/source';
import { exportEpub } from 'fumadocs-epub';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX_REQUESTS;
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return new Response('Too Many Requests', { status: 429 });
  }

  const epubKey = process.env.EPUB_EXPORT_KEY;
  if (epubKey) {
    const authHeader = request.headers.get('x-epub-key') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (authHeader !== epubKey) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const buffer = await exportEpub({
    source,
    config: {
      title: 'Fumadocs Documentation',
      author: 'Fuma Nama',
      description: 'Documentation for Fumadocs - the documentation framework for Next.js',
      cover: '/og.png',
    },
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': 'attachment; filename="fumadocs-docs.epub"',
    },
  });
}
