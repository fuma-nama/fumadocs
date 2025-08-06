import fs from "fs/promises";
import path from "path";
import { createServer as createViteServer } from "vite";

async function ssg() {
  // 1) Start Vite in middleware (SSR) mode
  const vite = await createViteServer({ server: { middlewareMode: true } });

  // 2) Load your SSR entry and your RSC handler entry
  const { generateHTML } = await vite.ssrLoadModule("/app/entry.ssr.tsx");
  const { default: rscHandler } = await vite.ssrLoadModule(
    "/app/entry.rsc.tsx"
  );

  // 3) List all the routes you want pre-rendered
  const routes = ["/", "/about", "/blog/first-post"];

  for (const url of routes) {
    const request = new Request("http://localhost" + url);

    // Pass your RSC handler, not global fetch
    const response = await generateHTML(request, rscHandler);
    const html = await response.text();

    // write to dist/…
    const filePath = path.join(
      "dist",
      url === "/" ? "index.html" : url.slice(1) + ".html"
    );
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, html, "utf-8");
    console.log("Wrote", filePath);
  }

  await vite.close();
}

ssg().catch((e) => {
  console.error(e);
  process.exit(1);
});