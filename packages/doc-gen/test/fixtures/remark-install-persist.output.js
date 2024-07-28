import {jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    pre: "pre",
    ...props.components
  }, {Tab, Tabs} = _components;
  if (!Tab) _missingMdxReference("Tab", true);
  if (!Tabs) _missingMdxReference("Tabs", true);
  return _jsxs(Tabs, {
    groupId: "package_install",
    persist: true,
    items: ["npm", "pnpm", "yarn", "bun"],
    children: [_jsx(Tab, {
      value: "npm",
      children: _jsx(_components.pre, {
        children: _jsx(_components.code, {
          className: "language-bash",
          children: "npm i next -D\n"
        })
      })
    }), _jsx(Tab, {
      value: "pnpm",
      children: _jsx(_components.pre, {
        children: _jsx(_components.code, {
          className: "language-bash",
          children: "pnpm add next -D\n"
        })
      })
    }), _jsx(Tab, {
      value: "yarn",
      children: _jsx(_components.pre, {
        children: _jsx(_components.code, {
          className: "language-bash",
          children: "yarn add next --dev\n"
        })
      })
    }), _jsx(Tab, {
      value: "bun",
      children: _jsx(_components.pre, {
        children: _jsx(_components.code, {
          className: "language-bash",
          children: "bun add next --dev\n"
        })
      })
    })]
  });
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, {
    ...props,
    children: _jsx(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
