module.exports = function loader(code) {
  const callback = this.async();

  import('./dist/webpack/index.js').then((mod) =>
    mod.default.call(this, code, callback),
  );
};
