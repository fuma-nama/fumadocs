import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";
export const toc = [{
  depth: 1,
  url: "#heading-1",
  title: _jsx(_Fragment, {
    children: "Heading 1"
  })
}, {
  depth: 2,
  url: "#heading-2",
  title: _jsx(_Fragment, {
    children: "Heading 2"
  })
}, {
  depth: 3,
  url: "#heading-3",
  title: _jsx(_Fragment, {
    children: "Heading 3"
  })
}, {
  depth: 3,
  url: "#hello-world",
  title: _jsx(_Fragment, {
    children: "Custom heading id"
  })
}, {
  depth: 3,
  url: "#math-c_l",
  title: _jsx(_Fragment, {
    children: "math $$C_L$$"
  })
}, {
  depth: 3,
  url: "#custom-heading-id-hello-world",
  title: _jsx(_Fragment, {
    children: "Custom heading id hello-world]"
  })
}, {
  depth: 3,
  url: "#code-here",
  title: _jsxs(_Fragment, {
    children: [_jsx("code", {
      children: "code"
    }), " here"]
  })
}];
function _createMdxContent(props) {
  const _components = {
    code: "code",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    p: "p",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      id: "heading-1",
      children: "Heading 1"
    }), "\n", _jsx(_components.p, {
      children: "Some text here"
    }), "\n", _jsx(_components.h2, {
      id: "heading-2",
      children: "Heading 2"
    }), "\n", _jsx(_components.p, {
      children: "Some text here"
    }), "\n", _jsx(_components.h3, {
      id: "heading-3",
      children: "Heading 3"
    }), "\n", _jsx(_components.p, {
      children: "Some text here"
    }), "\n", _jsx(_components.h3, {
      id: "hello-world",
      children: "Custom heading id"
    }), "\n", _jsx(_components.p, {
      children: "Some text here"
    }), "\n", _jsx(_components.h3, {
      id: "math-c_l",
      children: "math $$C_L$$"
    }), "\n", _jsx(_components.p, {
      children: "Some text here"
    }), "\n", _jsx(_components.h3, {
      id: "custom-heading-id-hello-world",
      children: "Custom heading id hello-world]"
    }), "\n", _jsx(_components.p, {
      children: "Some text here"
    }), "\n", _jsxs(_components.h3, {
      id: "code-here",
      children: [_jsx(_components.code, {
        children: "code"
      }), " here"]
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
