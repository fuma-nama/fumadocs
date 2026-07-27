/** Hosts whose embed URLs are safe to place in a sandboxed frame. */
const EMBEDDABLE_HOSTS = new Set([
  'youtube-nocookie.com',
  'player.vimeo.com',
  'open.spotify.com',
  'figma.com',
  'codepen.io',
  'codesandbox.io',
  'loom.com',
]);

export function getSafeHref(value: string | null | undefined): string | undefined {
  if (!value) return;
  if (value.startsWith('/')) return value;

  try {
    const { protocol } = new URL(value);
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') return value;
  } catch {
    return;
  }
}

export function getUrlHost(value: string): string {
  if (value.startsWith('/')) return 'This site';

  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

export function getUrlLabel(value: string): string {
  const host = getUrlHost(value);
  return host === 'This site' ? 'Embedded content' : host;
}

/**
 * Convert a URL into one that can be framed, or return `undefined` when it isn't a known
 * embeddable host. Unknown hosts fall back to a link card rather than a broken or unsafe frame.
 */
export function getEmbedUrl(value: string): string | undefined {
  if (value.startsWith('/')) return value;
  const href = getSafeHref(value);
  if (!href) return;

  const url = new URL(href);
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = url.pathname.startsWith('/embed/')
      ? url.pathname.split('/')[2]
      : url.searchParams.get('v');
    if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (host === 'vimeo.com' && /^\/\d+/.test(url.pathname)) {
    return `https://player.vimeo.com/video/${url.pathname.split('/')[1]}`;
  }

  return EMBEDDABLE_HOSTS.has(host) ? href : undefined;
}

/**
 * Notion-hosted files are always playable, but arbitrary external URLs are only worth putting in
 * a media element when they actually look like a media file.
 */
export function canRenderNativeMedia(url: string, internal: boolean, type: 'audio' | 'video') {
  if (internal) return true;
  const extension =
    type === 'video' ? /\.(?:mp4|og[gv]|webm)(?:$|[?#])/i : /\.(?:mp3|oga|ogg|wav)(?:$|[?#])/i;
  return extension.test(url);
}
