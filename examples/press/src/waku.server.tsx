import { createRouter } from '@fumapress/core';
import adapter from 'waku/adapters/default';
import RootLayout from './root';

const router = createRouter({
  root: RootLayout,
});

export default adapter(router.createPages());
