/**
 * Minimal, readable CSS stylesheet suitable for e-readers.
 */
export const defaultEpubStyles = `
body {
  font-family: Georgia, serif;
  font-size: 1em;
  line-height: 1.6;
  margin: 1em;
}

h1, h2, h3, h4, h5, h6 {
  font-family: Georgia, serif;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  page-break-after: avoid;
}

h1 { font-size: 1.5em; }
h2 { font-size: 1.3em; }
h3 { font-size: 1.15em; }

pre, code {
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 0.9em;
}

pre {
  background: #f5f5f5;
  padding: 1em;
  overflow-x: auto;
  page-break-inside: avoid;
}

code {
  background: #f5f5f5;
  padding: 0.2em 0.4em;
}

pre code {
  background: none;
  padding: 0;
}

img {
  max-width: 100%;
  height: auto;
}

blockquote {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 4px solid #ccc;
  color: #555;
}

table {
  border-collapse: collapse;
  width: 100%;
  page-break-inside: avoid;
}

th, td {
  border: 1px solid #ddd;
  padding: 0.5em;
}

th {
  background: #f5f5f5;
}

p {
  margin: 0.75em 0;
}

ul, ol {
  margin: 0.75em 0;
  padding-left: 1.5em;
}

a {
  color: #0066cc;
}
`;
