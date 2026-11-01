import { generateOGImage } from 'fumadocs-ui/og/takumi';
import type { AnyPage, App, Plugin, Route } from '../app';

/**
 * OG images of pages with Takumi, requires `takumi-js`.
 */
export function takumiPlugin({ prefix = '/og' }: { prefix?: string } = {}): Plugin {
  function imageUrl(app: App, page: AnyPage) {
    return `${app.base}${prefix.replace(/\/$/, '')}${app.toPath(page.url).replace(/\/$/, '')}/image.webp`;
  }

  return {
    name: 'takumi',
    async routes() {
      const routes: Route[] = [];
      for (const page of this.getPages()) {
        const { title, description } = await this.getPageData(page);
        routes.push({
          type: 'file',
          url: imageUrl(this, page),
          GET: () =>
            generateOGImage({ title, description, site: this.config.title, format: 'webp' }),
        });
      }
      return routes;
    },
    transformPage(page, data) {
      return { ...data, image: imageUrl(this, page) };
    },
  };
}
