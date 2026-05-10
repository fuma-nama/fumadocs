import { unstable_reactRouterRSC as reactRouterRSC } from '@react-router/dev/vite';
import rsc from '@vitejs/plugin-rsc';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import mdx from 'fumadocs-mdx/vite';

export default defineConfig({
  plugins: [mdx(), tailwindcss(), reactRouterRSC(), rsc()],
  resolve: {
    tsconfigPaths: true,
  },
});
