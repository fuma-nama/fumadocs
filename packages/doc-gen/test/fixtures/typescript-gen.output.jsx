/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    ...props.components
  }, {TypeTable} = _components;
  if (!TypeTable) _missingMdxReference("TypeTable", true);
  return <><_components.h2>{"Normal"}</_components.h2>{"\n"}<TypeTable type={{
    name: {
      "type": "string",
      "description": "",
      "default": undefined
    },
    description: {
      "type": "string",
      "description": "",
      "default": undefined
    },
    isGood: {
      "type": "boolean",
      "description": "",
      "default": undefined
    }
  }} /></>;
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
