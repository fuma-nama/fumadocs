import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";
import __img0 from "/Users/xred/dev/fumadocs/packages/core/test/fixtures/test.png";
function _createMdxContent(props) {
  const _components = {
    img: "img",
    p: "p",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.p, {
      children: _jsx(_components.img, {
        alt: "Test",
        placeholder: "blur",
        src: __img0
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        alt: "External",
        src: "https://picsum.photos/id/237/200/300",
        width: "200",
        height: "300"
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
