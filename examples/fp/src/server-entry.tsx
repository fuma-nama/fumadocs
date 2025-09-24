import { createPages } from 'waku';
import type { PathsForPages } from 'waku/router';
import Root from './components/root';
import App from './components/app';

const pages = createPages(async ({ createPage, createRoot }) => [
  createRoot({
    render: 'static',
    component: Root,
  }),
  createPage({
    render: 'static',
    path: '/',
    component: App,
  }),
]);

declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<typeof pages>;
  }
  interface CreatePagesConfig {
    pages: typeof pages;
  }
}

export default pages;
