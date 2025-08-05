import type { unstable_RSCRouteConfig as RSCRouteConfig } from "react-router";

export function routes() {
  return [
    {
      id: "root",
      path: "",
      lazy: () => import("./root/route"),
      children: [
        {
          id: "home",
          index: true,
          lazy: () => import("./home/route"),
        },
        {
          id: "about",
          path: "about",
          lazy: () => import("./about/route"),
        },
        {
          id: "docs",
          path: "docs/*",
          lazy: () => import("./docs/route"),
        },
        {
          id: "article1",
          path: "articles/article1",
          lazy: () => import("./articles/article1/route"),
        },
        {
          id: "article2",
          path: "articles/article2",
          lazy: () => import("./articles/article2/route"),
        },
        {
          id: "article3",
          path: "articles/article3",
          lazy: () => import("./articles/article3/route"),
        },
      ],
    },
  ] satisfies RSCRouteConfig;
}