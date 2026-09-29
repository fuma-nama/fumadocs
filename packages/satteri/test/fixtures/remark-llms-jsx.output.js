import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const structuredData = {
    "contents": [
        {
            "heading": "hello-world",
            "content": "Content with inline bold element."
        },
        {
            "heading": "hello-world",
            "content": "Some content here."
        },
        {
            "heading": "hello-world",
            "content": "nested"
        },
        {
            "heading": "hello-world",
            "content": "Ending paragraph."
        }
    ],
    "headings": [{
        "id": "hello-world",
        "content": "Hello World"
    }]
};
export const toc = [{
    title: _jsx(_Fragment, { children: "Hello World" }),
    url: "#hello-world",
    depth: 2
}];
import { asMarkdown as _asMarkdown, jsxComponents as _jsxComponents } from "fumadocs-core/server";
export function _markdown(props) {
    if (!_asMarkdown()) return null;
    const _c = _jsxComponents(props.components);
    return _jsxs(_Fragment, { children: [
        "## Hello World [#hello-world]\n\nContent with ",
        _jsx("span", { children: _jsx(_c.Badge, {
            type: "info",
            children: "inline **bold**"
        }) }),
        " element.\n\n",
        _jsxs(_c.Callout, {
            title: "Note",
            count: 1 + 1,
            open: true,
            children: ["\nSome *content* here.\n\n", _jsx(_c.Tabs, {
                items: ["a", "b"],
                children: "\nnested\n"
            })]
        }),
        "\n\nEnding paragraph.\n"
    ] });
}
function _createMdxContent(props) {
    const _components = Object.assign({
        em: "em",
        h2: "h2",
        p: "p",
        strong: "strong"
    }, props.components);
    const { Badge, Callout, Tabs } = _components;
    if (!Badge) _missingMdxReference("Badge", true);
    if (!Callout) _missingMdxReference("Callout", true);
    if (!Tabs) _missingMdxReference("Tabs", true);
    return _jsxs(_Fragment, { children: [
        _jsx(_components.h2, {
            id: "hello-world",
            children: "Hello World"
        }),
        "\n",
        _jsxs(_components.p, { children: [
            "Content with ",
            _jsxs(Badge, {
                type: "info",
                children: ["inline ", _jsx(_components.strong, { children: "bold" })]
            }),
            " element."
        ] }),
        "\n",
        _jsxs(Callout, {
            title: "Note",
            count: 1 + 1,
            open: true,
            children: [_jsxs(_components.p, { children: [
                "Some ",
                _jsx(_components.em, { children: "content" }),
                " here."
            ] }), _jsx(Tabs, {
                items: ["a", "b"],
                children: _jsx(_components.p, { children: "nested" })
            })]
        }),
        "\n",
        _jsx(_components.p, { children: "Ending paragraph." })
    ] });
}
function MDXContent(props = {}) {
    const { wrapper: MDXLayout } = props.components || {};
    return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, { children: _jsx(_createMdxContent, props) })) : _createMdxContent(props);
}
export default MDXContent;
function _missingMdxReference(id, component) {
    throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
