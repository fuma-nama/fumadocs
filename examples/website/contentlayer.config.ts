import { createConfig } from "next-docs-ui/contentlayer";
import { makeSource } from "contentlayer/source-files";

export default makeSource({
    ...createConfig("/", "docs"),
});
