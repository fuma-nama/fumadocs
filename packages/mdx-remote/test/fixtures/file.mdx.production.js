"use strict";
const {Fragment: _Fragment, jsx: _jsx, jsxs: _jsxs} = arguments[0];
const toc = [{
  depth: 2,
  url: "#you-found-me",
  title: _jsxs(_Fragment, {
    children: ["You ", _jsx("strong", {
      children: "found"
    }), " ", _jsx("code", {
      children: "me"
    }), "!"]
  })
}];
function _createMdxContent(props) {
  const _components = {
    code: "code",
    h2: "h2",
    strong: "strong",
    ...props.components
  };
  return _jsxs(_components.h2, {
    id: "you-found-me",
    children: ["You ", _jsx(_components.strong, {
      children: "found"
    }), " ", _jsx(_components.code, {
      children: "me"
    }), "!"]
  });
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, {
    ...props,
    children: _jsx(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}
return {
  toc,
  default: MDXContent
};
