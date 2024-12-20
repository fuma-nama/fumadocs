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
  return <Tabs items={["TypeScript", "JavaScript"]}><Tab value="TypeScript"><_components.pre><_components.code className="language-tsx">{"import { ReactNode } from 'react';\n\nexport default function Layout({ children }: { children: ReactNode }) {\n  const v: string = 'hello world' as any;\n\n  return (\n    <div>\n      {children} {v}\n    </div>\n  );\n}\n"}</_components.code></_components.pre></Tab><Tab value="JavaScript"><_components.pre><_components.code className="language-jsx">{"export default function Layout({ children }) {\n\tconst v = \"hello world\";\n\treturn <div>\n      {children} {v}\n    </div>;\n}\n\n"}</_components.code></_components.pre></Tab></Tabs>;
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
