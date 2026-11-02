import type { Page } from 'fumadocs-core/source';
import { generateOGImage } from 'fumadocs-ui/og/takumi';
import type { App, Plugin, Route } from '../app';
import { pagePath } from '../shared';

export interface TakumiPluginOptions {
  /**
   * The URL prefix of images, without `base`.
   *
   * @defaultValue '/og'
   */
  prefix?: string;
}

/**
 * OG images of pages with Takumi, requires `takumi-js`.
 */
export function takumiPlugin({ prefix = '/og' }: TakumiPluginOptions = {}): Plugin {
  const dir = prefix.replace(/\/$/, '');
  const imageUrl = (app: App, page: Page) => `${app.base}${dir}${pagePath(app, page)}/image.webp`;

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
