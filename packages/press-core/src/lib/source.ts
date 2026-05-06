export function slugsToImagePath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.webp');
  } else {
    segments[segments.length - 1] += '.webp';
  }

  return {
    segments,
    url: `/${segments.join('/')}`,
  };
}

export function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.md');
  } else {
    segments[segments.length - 1] += '.md';
  }

  return {
    segments,
    url: `/${segments.join('/')}`,
  };
}

export function markdownPathToSlugs(segs: string[]) {
  const slugs = [...segs];
  if (slugs.length === 0) return [];

  slugs[slugs.length - 1] = slugs[slugs.length - 1]!.replace(/\.md$/, '');
  if (slugs.length === 1 && slugs[0] === 'index') slugs.pop();

  return slugs;
}
