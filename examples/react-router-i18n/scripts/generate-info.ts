import { source } from '@/lib/source';

export interface Info {
  prerender: string[];
}

const info: Info = {
  prerender: source.getPages().map((page) => page.url),
};

await Bun.write('.react-router/_info', JSON.stringify(info));
