export function getPageImagePath(slugs: string[]) {
  const segments = [...slugs, 'image.png'];

  return `/og/docs/${segments.join('/')}`;
}