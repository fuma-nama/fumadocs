import {Fragment as _Fragment, jsx as _jsx} from "react/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    p: "p",
    span: "span",
    ...props.components
  }, {TypeTable} = _components;
  if (!TypeTable) _missingMdxReference("TypeTable", true);
  return _jsx(_Fragment, {
    children: _jsx(_Fragment, {
      children: _jsx(TypeTable, {
        type: {
          name: {
            type: _jsx(_components.span, {
              className: "shiki",
              children: _jsx(_components.code, {
                children: _jsx(_components.span, {
                  style: {
                    "--shiki-light": "#24292E",
                    "--shiki-dark": "#E1E4E8"
                  },
                  children: "string"
                })
              })
            }),
            typeDescription: _jsx(_components.span, {
              className: "shiki",
              children: _jsx(_components.code, {
                children: _jsx(_components.span, {
                  style: {
                    "--shiki-light": "#24292E",
                    "--shiki-dark": "#E1E4E8"
                  },
                  children: "string"
                })
              })
            }),
            required: true,
            default: _jsx(_components.span, {
              className: "shiki",
              children: _jsx(_components.code, {
                children: _jsx(_components.span, {
                  style: {
                    "--shiki-light": "#24292E",
                    "--shiki-dark": "#E1E4E8"
                  },
                  children: "Henry"
                })
              })
            }),
            description: _jsx(_Fragment, {
              children: _jsx(_components.p, {
                children: "The name of player"
              })
            })
          },
          age: {
            type: _jsx(_components.span, {
              className: "shiki",
              children: _jsx(_components.code, {
                children: _jsx(_components.span, {
                  style: {
                    "--shiki-light": "#24292E",
                    "--shiki-dark": "#E1E4E8"
                  },
                  children: "timestamp"
                })
              })
            }),
            typeDescription: _jsx(_components.span, {
              className: "shiki",
              children: _jsx(_components.code, {
                children: _jsx(_components.span, {
                  style: {
                    "--shiki-light": "#24292E",
                    "--shiki-dark": "#E1E4E8"
                  },
                  children: "number"
                })
              })
            }),
            required: true
          },
          privateValue: {
            type: _jsx(_components.span, {
              className: "shiki",
              children: _jsx(_components.code, {
                children: _jsx(_components.span, {
                  style: {
                    "--shiki-light": "#24292E",
                    "--shiki-dark": "#E1E4E8"
                  },
                  children: "string"
                })
              })
            }),
            typeDescription: _jsx(_components.span, {
              className: "shiki",
              children: _jsx(_components.code, {
                children: _jsx(_components.span, {
                  style: {
                    "--shiki-light": "#24292E",
                    "--shiki-dark": "#E1E4E8"
                  },
                  children: "string"
                })
              })
            }),
            required: true
          }
        }
      })
    })
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
