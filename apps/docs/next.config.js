const withAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const config = {
    pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
    reactStrictMode: true,
    images: {
        domains: ["i.pravatar.cc"],
    },
};

const { withContentlayer } = require("next-contentlayer");

module.exports = withAnalyzer(withContentlayer(config));
