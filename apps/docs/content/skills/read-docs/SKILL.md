---
name: read-docs
description: Enables efficient, accurate retrieval of content from Fumadocs-powered documentation sites.
---

A specialized skill for exploring and retrieving accurate, clean content from documentation websites built with Fumadocs.

Fumadocs-powered sites typically expose three LLM-friendly features:

1. **Page Discovery via llms.txt**  
   The site provides a plain-text file at the root URL: `/llms.txt`.  
   This file contains a complete list of crawlable routes (one per line), often with comments or metadata indicating which paths are documentation pages.

2. **Processed Markdown for Docs Pages**  
   Fumadocs templates often expose **processed Markdown** (plain Markdown derived from MDX) at `/llms.mdx/docs/<path>/content.md` for each page. Some sites also rewrite `/docs/.../page.mdx` or negotiate `Accept: text/markdown` to that URL via middleware.  
   Example:
   - Rendered page: https://example.com/docs/installation
   - Markdown for LLMs: https://example.com/llms.mdx/docs/installation/content.md  
     Prefer this over scraping HTML when the site exposes it.

3. **Search API**  
   The site exposes a JSON search endpoint:  
   GET /api/search?query=<search-term>
   It returns structured results (usually an array of objects with title, excerpt, URL, and sometimes hierarchy).

When a user query involves a library, tool, framework, or project whose official documentation is hosted on a Fumadocs site:

- First, confirm it is Fumadocs-powered (user confirmation, known projects, or successfully fetching `/llms.txt`).
- Fetch `/llms.txt` to obtain the full list of available pages.
- When retrieving the content of a specific docs page, prefer the markdown endpoint (often `.../content.md` under `/llms.mdx/docs/`) or a `.mdx` suffix on the docs path if the site uses that pattern.
- When the user needs to find something (keyword, feature, concept), use the `/api/search` endpoint with a precise query.
- Parse and reason over the raw MDX or JSON results to provide accurate, up-to-date answers.
- Cite the exact source URL (prefer the original rendered URL for user readability, but base your understanding on the raw version).

Prioritize these endpoints over scraping rendered HTML to minimize noise and maximize accuracy.
