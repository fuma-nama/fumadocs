import { defineConfig } from "tsup";
import tsconfig from "./tsconfig.json";

export default defineConfig({
    name: "next-docs",
    entry: ["src/api/index.ts", "src/components/index.ts", "src/lib/index.ts"],
    format: "esm",
    dts: true,
    target: tsconfig.compilerOptions.target as "es2016",
});
