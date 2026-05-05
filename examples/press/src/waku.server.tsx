import { createRouter } from '@fumapress/core';
import adapter from 'waku/adapters/default';
import RootLayout from './root';

const router = createRouter({
  root: RootLayout,
  site: {
    name: 'Example Site',
    git: {
      user: 'fuma-nama',
      branch: 'main',
      repo: 'fumadocs',
    },
  },
});

export default adapter(router.createPages());
