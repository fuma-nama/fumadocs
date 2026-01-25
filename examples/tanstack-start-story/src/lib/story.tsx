import { createFileSystemCache, defineStoryFactory } from "@fumadocs/story";

export const { defineStory, getStoryPayloads } = defineStoryFactory({
  // use only on Vercel
  cache:
    process.env.NODE_ENV === "production"
      ? createFileSystemCache(".tanstack/fumadocs-story")
      : undefined,
});
