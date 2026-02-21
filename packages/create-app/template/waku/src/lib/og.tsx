export function getPageImage(slugs: string[]) {
  const segments = [...slugs, 'image.webp'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}
