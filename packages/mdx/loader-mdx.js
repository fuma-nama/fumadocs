/* eslint-env node -- Node.js env */

export default function loader(code) {
  const callback = this.async();
  import('./dist/loader-mdx.js').then((mod) =>
    mod.default.call(this, code, callback),
  );
}
