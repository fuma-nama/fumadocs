import { expect, test } from 'vitest';
import { createHighlighter, hastToHtml } from 'shiki';
import { transformerTwoslash } from '../src/transformer';
import { fileURLToPath } from 'node:url';

test('render', async () => {
  const highlighter = await createHighlighter({ themes: ['github-light'], langs: ['ts'] });
  const transformer = transformerTwoslash({
    twoslashOptions: {
      cwd: fileURLToPath(new URL('./', import.meta.url)),
      compilerOptions: { types: ['node'] },
    },
  });
  const code = `// @errors: 2322 2339
// @log: hello
/** the value */
const value = 'x';
//    ^^^^^ highlight
const n: number = value;
//    ^?
value.toUpper
//           ^|
`;
  const hast = highlighter.codeToHast(code, {
    lang: 'ts',
    theme: 'github-light',
    meta: { __raw: 'twoslash' },
    transformers: [transformer],
  });
  expect(hastToHtml(hast).replaceAll('><', '>\n<')).toMatchInlineSnapshot(`
    "<pre class="shiki github-light twoslash lsp" style="background-color:#fff;color:#24292e" tabindex="0">
    <code>
    <span class="line">
    <span style="color:#6A737D">/** the value */</span>
    </span>
    <div class="twoslash-tag-line twoslash-tag-log-line nd-copy-ignore">
    <span class="twoslash-tag-icon tag-log-icon">
    <svg viewBox="0 0 32 32">
    <path fill="currentColor" d="M17 22v-8h-4v2h2v6h-3v2h8v-2zM16 8a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 16 8">
    </path>
    <path fill="currentColor" d="M26 28H6a2.002 2.002 0 0 1-2-2V6a2.002 2.002 0 0 1 2-2h20a2.002 2.002 0 0 1 2 2v20a2.002 2.002 0 0 1-2 2M6 6v20h20V6Z">
    </path>
    </svg>
    </span>hello</div>
    <span class="line">
    <span style="color:#D73A49">const</span>
    <span style="color:#005CC5"> </span>
    <span class="highlighted-word twoslash-highlighted">
    <span style="color:#005CC5">
    <Popup>
    <PopupContent class="nd-copy-ignore">
    <div class="twoslash shiki fd-codeblock prose-no-margin">
    <code class="twoslash-popup-code">
    <span style="color:#D73A49">const</span>
    <span style="color:#005CC5"> value</span>
    <span style="color:#D73A49">:</span>
    <span style="color:#032F62"> "x"</span>
    </code>
    </div>
    <div class="prose twoslash-popup-docs">
    <p>the value</p>
    </div>
    </PopupContent>
    <PopupTrigger>value</PopupTrigger>
    </Popup>
    </span>
    </span>
    <span style="color:#D73A49"> =</span>
    <span style="color:#032F62"> 'x'</span>
    <span style="color:#24292E">;</span>
    </span>
    <span class="line">
    <span style="color:#D73A49">const</span>
    <span style="color:#005CC5"> </span>
    <span class="twoslash-error">
    <span style="color:#005CC5">
    <span class="twoslash-hover">n</span>
    </span>
    </span>
    <span style="color:#D73A49">:</span>
    <span style="color:#005CC5"> number</span>
    <span style="color:#D73A49"> =</span>
    <span style="color:#24292E"> </span>
    <span style="color:#24292E">
    <Popup>
    <PopupContent class="nd-copy-ignore">
    <div class="twoslash shiki fd-codeblock prose-no-margin">
    <code class="twoslash-popup-code">
    <span style="color:#D73A49">const</span>
    <span style="color:#005CC5"> value</span>
    <span style="color:#D73A49">:</span>
    <span style="color:#032F62"> "x"</span>
    </code>
    </div>
    <div class="prose twoslash-popup-docs">
    <p>the value</p>
    </div>
    </PopupContent>
    <PopupTrigger>value</PopupTrigger>
    </Popup>
    </span>
    <span style="color:#24292E">;</span>
    </span>
    <div class="twoslash-meta-line twoslash-query-line nd-copy-ignore">
    <span>    </span>
    <span class="twoslash-popup-container nd-copy-ignore">
    <div class="twoslash-popup-arrow">
    </div>
    <div class="twoslash shiki fd-codeblock prose-no-margin">
    <code class="twoslash-popup-code">
    <span style="color:#D73A49">const</span>
    <span style="color:#005CC5"> n</span>
    <span style="color:#D73A49">:</span>
    <span style="color:#005CC5"> number</span>
    </code>
    </div>
    </span>
    </div>
    <div class="twoslash-meta-line twoslash-error-line nd-copy-ignore">Type 'string' is not assignable to type 'number'.</div>
    <span class="line">
    <span style="color:#24292E">
    <Popup>
    <PopupContent class="nd-copy-ignore">
    <div class="twoslash shiki fd-codeblock prose-no-margin">
    <code class="twoslash-popup-code">
    <span style="color:#D73A49">const</span>
    <span style="color:#005CC5"> value</span>
    <span style="color:#D73A49">:</span>
    <span style="color:#032F62"> "x"</span>
    </code>
    </div>
    <div class="prose twoslash-popup-docs">
    <p>the value</p>
    </div>
    </PopupContent>
    <PopupTrigger>value</PopupTrigger>
    </Popup>
    </span>
    <span style="color:#24292E">.</span>
    <span class="twoslash-error">
    <span style="color:#24292E">
    <span>toUpper<span class="twoslash-completion-cursor nd-copy-ignore">
    <ul class="twoslash-completion-list nd-copy-ignore">
    <li>
    <span class="twoslash-completions-icon completions-method">
    <svg viewBox="0 0 32 32">
    <path fill="currentColor" d="m19.626 29.526l-.516-1.933a12.004 12.004 0 0 0 6.121-19.26l1.538-1.28a14.003 14.003 0 0 1-7.143 22.473">
    </path>
    <path fill="currentColor" d="M10 29H8v-3.82l.804-.16C10.262 24.727 12 23.62 12 20v-1.382l-4-2v-2.236l4-2V12c0-5.467 3.925-9 10-9h2v3.82l-.804.16C21.738 7.273 20 8.38 20 12v.382l4 2v2.236l-4 2V20c0 5.467-3.925 9-10 9m0-2c4.935 0 8-2.682 8-7v-2.618l3.764-1.882L18 13.618V12c0-4.578 2.385-6.192 4-6.76V5c-4.935 0-8 2.682-8 7v1.618L10.236 15.5L14 17.382V20c0 4.578-2.385 6.192-4 6.76Z">
    </path>
    <path fill="currentColor" d="M5.231 24.947a14.003 14.003 0 0 1 7.147-22.474l.516 1.932a12.004 12.004 0 0 0-6.125 19.263Z">
    </path>
    </svg>
    </span>
    <span>
    <span class="twoslash-completions-matched">toUpper</span>
    <span class="twoslash-completions-unmatched">Case</span>
    </span>
    </li>
    </ul>
    </span>
    </span>
    </span>
    </span>
    </span>
    <div class="twoslash-meta-line twoslash-error-line nd-copy-ignore">Property 'toUpper' does not exist on type '"x"'.</div>
    <span class="line">
    </span>
    </code>
    </pre>"
  `);
});
