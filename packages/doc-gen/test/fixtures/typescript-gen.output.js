import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    h2: "h2",
    ...props.components
  }, {TypeTable} = _components;
  if (!TypeTable) _missingMdxReference("TypeTable", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h2, {
      children: "Normal"
    }), "\n", _jsx(TypeTable, {
      type: {
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
      }
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
