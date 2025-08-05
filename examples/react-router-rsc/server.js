import { createRequestListener } from "@remix-run/node-fetch-server";
import compression from "compression";
import express from "express";

import build from "./dist/rsc/index.js";

const app = express();

app.use(
  "/assets",
  compression(),
  express.static("dist/client/assets", {
    immutable: true,
    maxAge: "1y",
  }),
);
app.use(compression(), express.static("dist/client"));

app.get("/.well-known/appspecific/com.chrome.devtools.json", (_, res) => {
  res.status(404);
  res.end();
});

app.use(createRequestListener(build));

const PORT = Number.parseInt(process.env.PORT || "3000");
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (http://localhost:${PORT})`);
});
