import { defineConfig } from "tsup";
import tsconfig from "./tsconfig.json";

export default defineConfig({
    entry: [
        "./src/{contentlayer,mdx,components}/index.{ts,tsx}",
        "./src/*.{ts,tsx}",
    ],
    external: ["next-docs-zeta", "shiki"],
    format: "esm",
    dts: true,
    target: tsconfig.compilerOptions.target as "es2016",
});
