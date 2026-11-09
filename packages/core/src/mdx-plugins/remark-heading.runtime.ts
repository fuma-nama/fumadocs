import { slug } from 'github-slugger';

/** the slug of a value rendered in a heading, booleans and nullish values render nothing */
export function headingSlug(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? slug(String(value)) : '';
}
