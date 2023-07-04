import { defineConfig } from "tsup";
import tsconfig from "./tsconfig.json";

export default defineConfig({
    entry: ["src/{server,breadcrumb,sidebar,toc,search,link}/index.{ts,tsx}"],
    format: "esm",
    dts: true,
    target: tsconfig.compilerOptions.target as "es2016",
});
