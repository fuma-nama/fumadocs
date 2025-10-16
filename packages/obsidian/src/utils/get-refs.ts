import type { ParsedFile } from '@/build-storage';
import path from 'node:path';
import { stash } from '@/utils/stash';
import { slug } from 'github-slugger';

export function getFileHref(
  ref: ParsedFile,
  sourceFile: ParsedFile,
  heading?: string,
) {
  if (ref.format === 'media' && ref.url) return ref.url;

  const dir = path.dirname(sourceFile.outPath);
  let url = stash(path.relative(dir, ref.outPath));
  if (!url.startsWith('../')) url = `./${url}`;
  if (heading) url += `#${getHeadingHash(heading)}`;

  return url;
}

export function getHeadingHash(heading: string) {
  // for refs to block Ids, ignore slugify
  return heading.startsWith('^') ? heading : slug(heading);
}
