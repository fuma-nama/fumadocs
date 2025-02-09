/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
function _createMdxContent(props) {
  const _components = {
    code: "code",
    h2: "h2",
    pre: "pre",
    ...props.components
  };
  return <><><_components.h2>{"Hello World"}</_components.h2><_components.pre><_components.code className="language-ts">{"console.log(\"Goodbye\")\n"}</_components.code></_components.pre></>{"\n"}<></></>;
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
