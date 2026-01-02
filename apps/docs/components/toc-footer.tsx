"use client";

import { CircleArrowUp, SquareArrowOutUpRight } from "lucide-react";

export function TOCFooter({ githubUrl }: { githubUrl: string }) {
  return (
    <div className="mt-4 hidden w-full border-t py-4 pl-2 text-fd-muted-foreground text-sm lg:flex lg:flex-col lg:gap-2">
      <a
        aria-label="Edit this page on Github"
        className="transition-colors hover:text-fd-foreground"
        href={githubUrl}
        rel="noopener"
        target="_blank"
      >
        Edit this page on Github
        <SquareArrowOutUpRight className="mb-px ml-1 inline-flex size-3" />
      </a>
      
      <button
        type="button"
        className="group flex items-center gap-x-1 opacity-100 transition-opacity duration-300"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ behavior: "smooth", top: 0 });
        }}
      >
        <p className="transition-colors group-hover:text-fd-foreground">Scroll to top</p>
        <CircleArrowUp className="size-3.5 text-fd-muted-foreground transition-colors group-hover:text-fd-foreground" />
      </button>
    </div>
  );
}
