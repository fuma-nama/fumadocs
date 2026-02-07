---
name: read-docs
description: Enables efficient, accurate retrieval of content from Fumadocs-powered documentation sites.
---

A specialized skill for exploring and retrieving accurate, clean content from documentation websites built with Fumadocs.

Fumadocs-powered sites typically expose three LLM-friendly features:

1. **Page Discovery via llms.txt**  
   The site provides a plain-text file at the root URL: `/llms.txt`.  
   This file contains a complete list of crawlable routes (one per line), often with comments or metadata indicating which paths are documentation pages.

2. **Raw MDX Content for Docs Pages**  
   Any documentation page under `/docs/` (or similar documentation root) can be retrieved in its raw MDX source format by appending `.mdx` to the path.  
   Example:
   - Rendered page: https://example.com/docs/installation
   - Raw MDX: https://example.com/docs/installation.mdx  
     This returns clean Markdown/MDX without navigation, headers, footers, or client-side HTML noise.

3. **Search API**  
   The site exposes a JSON search endpoint:  
   GET /api/search?query=<search-term>
   It returns structured results (usually an array of objects with title, excerpt, URL, and sometimes hierarchy).

When a user query involves a library, tool, framework, or project whose official documentation is hosted on a Fumadocs site:

- First, confirm it is Fumadocs-powered (user confirmation, known projects, or successfully fetching `/llms.txt`).
- Fetch `/llms.txt` to obtain the full list of available pages.
- When retrieving the content of a specific docs page, always prefer the `.mdx` version.
- When the user needs to find something (keyword, feature, concept), use the `/api/search` endpoint with a precise query.
- Parse and reason over the raw MDX or JSON results to provide accurate, up-to-date answers.
- Cite the exact source URL (prefer the original rendered URL for user readability, but base your understanding on the raw version).

Prioritize these endpoints over scraping rendered HTML to minimize noise and maximize accuracy.
