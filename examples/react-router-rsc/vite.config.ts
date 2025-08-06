import rsc from "@vitejs/plugin-rsc/plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import mdx from 'fumadocs-mdx/vite'
import * as MdxConfig from './source.config'

export default defineConfig({
  plugins: [
    mdx(MdxConfig),
    tailwindcss(),
    react(),
    rsc({
      entries: {
        client: "app/entry.browser.tsx",
        rsc: "app/entry.rsc.tsx",
        ssr: "app/entry.ssr.tsx",
      },
    }),
    devtoolsJson(),
  ],
});
