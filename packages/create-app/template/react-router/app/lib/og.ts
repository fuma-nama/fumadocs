export function getPageImagePath(slugs: string[]) {
  const segments = [...slugs, 'image.webp'];

  return `/og/docs/${segments.join('/')}`;
}
