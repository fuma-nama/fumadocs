"use strict";
const {Fragment: _Fragment, jsxDEV: _jsxDEV} = arguments[0];
const toc = [{
  depth: 2,
  url: "#you-found-me",
  title: _jsxDEV(_Fragment, {
    children: ["You ", _jsxDEV("strong", {
      children: "found"
    }, undefined, false, {
      fileName: "<source.js>",
      lineNumber: 1,
      columnNumber: 8
    }, this), " ", _jsxDEV("code", {
      children: "me"
    }, undefined, false, {
      fileName: "<source.js>",
      lineNumber: 1,
      columnNumber: 18
    }, this), "!"]
  }, undefined, true, {
    fileName: "<source.js>"
  }, this)
}];
function _createMdxContent(props) {
  const _components = {
    code: "code",
    h2: "h2",
    strong: "strong",
    ...props.components
  };
  return _jsxDEV(_components.h2, {
    id: "you-found-me",
    children: ["You ", _jsxDEV(_components.strong, {
      children: "found"
    }, undefined, false, {
      fileName: "<source.js>",
      lineNumber: 1,
      columnNumber: 8
    }, this), " ", _jsxDEV(_components.code, {
      children: "me"
    }, undefined, false, {
      fileName: "<source.js>",
      lineNumber: 1,
      columnNumber: 18
    }, this), "!"]
  }, undefined, true, {
    fileName: "<source.js>",
    lineNumber: 1,
    columnNumber: 1
  }, this);
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsxDEV(MDXLayout, {
    ...props,
    children: _jsxDEV(_createMdxContent, {
      ...props
    }, undefined, false, {
      fileName: "<source.js>"
    }, this)
  }, undefined, false, {
    fileName: "<source.js>"
  }, this) : _createMdxContent(props);
}
return {
  toc,
  default: MDXContent
};
