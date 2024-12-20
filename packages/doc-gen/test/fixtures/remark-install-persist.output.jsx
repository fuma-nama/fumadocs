/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
function _createMdxContent(props) {
  const _components = {
    code: "code",
    pre: "pre",
    ...props.components
  }, {Tab, Tabs} = _components;
  if (!Tab) _missingMdxReference("Tab", true);
  if (!Tabs) _missingMdxReference("Tabs", true);
  return <Tabs groupId="package_install" persist items={["npm", "pnpm", "yarn", "bun"]}><Tab value="npm"><_components.pre><_components.code className="language-bash">{"npm i next -D\n"}</_components.code></_components.pre></Tab><Tab value="pnpm"><_components.pre><_components.code className="language-bash">{"pnpm add next -D\n"}</_components.code></_components.pre></Tab><Tab value="yarn"><_components.pre><_components.code className="language-bash">{"yarn add next --dev\n"}</_components.code></_components.pre></Tab><Tab value="bun"><_components.pre><_components.code className="language-bash">{"bun add next --dev\n"}</_components.code></_components.pre></Tab></Tabs>;
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
