import {
  createElement,
  Fragment,
  isValidElement,
  StrictMode,
  Suspense,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import { components } from 'virtual:fumadocs/components';
import type { NodeBody, PageBody } from './app';
import type { IslandNode } from './shared';
import NodeContent from './ui/NodeContent.astro';

/** the names of components, the island gets them from the same MDX components */
const names = new Map<unknown, string>();
for (const [name, component] of Object.entries(components)) {
  // the layout of island
  if (name !== 'wrapper' && !names.has(component)) names.set(component, name);
}

const unserializable = Symbol('unserializable');

/**
 * Render React content as the content island, like MDX bodies: components of the MDX components hydrate, React renders the others on the server.
 *
 * Highlighted code and the parts the island can't receive, like class components and elements in props, render once by Astro as slots.
 */
export async function toPageBody({ node, toc }: NodeBody): Promise<PageBody> {
  const tree: IslandNode[] = [];
  const slots: string[] = [];
  await serialize(node, tree, slots, false);
  return {
    component: NodeContent,
    props: { tree: JSON.stringify(tree), slots },
    // serializable, like the TOC of MDX
    toc: toc?.map((item) => ({ ...item, title: textOf(item.title) })),
  };
}

/** add the island nodes of `node` to `out`, `pre` for the children of code blocks */
async function serialize(
  node: unknown,
  out: IslandNode[],
  slots: string[],
  pre: boolean,
): Promise<void> {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
    out.push(String(node));
    return;
  }
  if (typeof (node as PromiseLike<unknown>).then === 'function')
    return serialize(await node, out, slots, pre);
  if (typeof node === 'object' && Symbol.iterator in node) {
    for (const child of node as Iterable<unknown>) await serialize(child, out, slots, pre);
    return;
  }
  if (!isValidElement(node)) return;

  const { type, props } = node as ReactElement<Record<string, unknown>>;
  if (type === Fragment || type === Suspense || type === StrictMode)
    return serialize(props.children, out, slots, pre);

  if (typeof type === 'string') {
    const { children, ...rest } = props;
    if (pre && type === 'code') {
      const { dangerouslySetInnerHTML: html, ...code } = rest as Record<string, unknown> & {
        dangerouslySetInnerHTML?: { __html: string };
      };
      // highlighted code is rendered once by Astro, rather than also being in the island props
      if (html || isStatic(children)) {
        out.push([
          type,
          hostProps(code),
          slot(slots, html?.__html ?? renderToStaticMarkup(children as ReactNode)),
        ]);
        return;
      }
    }
    const nodes: IslandNode[] = [];
    await serialize(children, nodes, slots, type === 'pre');
    out.push([type, hostProps(rest), ...nodes]);
    return;
  }

  const name = names.get(type);
  if (name !== undefined && typeof props.children !== 'function') {
    // refs are of the browser
    const { children, ref: _ref, ...rest } = props;
    const json = await toJson(rest, slots);
    if (json !== unserializable) {
      const nodes: IslandNode[] = [];
      await serialize(children, nodes, slots, name === 'pre');
      out.push([1, name, json as Record<string, unknown>, ...nodes]);
      return;
    }
  }

  // other function components render on the server like server components, their output can have components
  if (
    typeof type === 'function' &&
    !(type.prototype as { isReactComponent?: unknown } | undefined)?.isReactComponent
  ) {
    const result = call(type as (props: object) => unknown, props);
    if (result) return serialize(await result.value, out, slots, pre);
  }

  // class components, `memo()`, context providers and the others are rendered by React
  out.push(slot(slots, await render(node)));
}

/** call a function component in a render of React, so it can use hooks, `undefined` when it throws */
function call(type: (props: object) => unknown, props: object): { value: unknown } | undefined {
  let result: { value: unknown } | undefined;
  try {
    renderToStaticMarkup(
      createElement(() => {
        result = { value: type(props) };
        return null;
      }),
    );
  } catch {
    // when React renders it instead, it waits for suspending components, and throws real errors
    return;
  }
  return result;
}

/** the HTML of a React node */
async function render(node: ReactNode): Promise<string> {
  const { prelude } = await prerender(node);
  return new Response(prelude).text();
}

function slot(slots: string[], html: string): { $slot: string } {
  slots.push(html);
  return { $slot: `s${slots.length - 1}` };
}

/** event handlers and refs are of the browser, like React rendering HTML */
function hostProps(props: Record<string, unknown>): Record<string, unknown> | 0 {
  let out: Record<string, unknown> | 0 = 0;
  for (const key in props) {
    const value = props[key];
    if (key !== 'ref' && typeof value !== 'function') (out ||= {})[key] = value;
  }
  return out;
}

/** the props of a component in the island, elements render into slots */
async function toJson(value: unknown, slots: string[]): Promise<unknown> {
  if (typeof value === 'function') return unserializable;
  if (typeof value !== 'object' || value === null) return value;
  if (isValidElement(value)) return slot(slots, await render(value));
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      const json = await toJson(item, slots);
      if (json === unserializable) return unserializable;
      out.push(json);
    }
    return out;
  }

  const prototype = Object.getPrototypeOf(value);
  // like dates, serialized by `toJSON()`
  if (prototype !== Object.prototype && prototype !== null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const json = await toJson(item, slots);
    if (json === unserializable) return unserializable;
    out[key] = json;
  }
  return out;
}

/** HTML elements and text only */
function isStatic(node: unknown): boolean {
  if (typeof node !== 'object' || node === null) return typeof node !== 'function';
  if (Array.isArray(node)) {
    for (const child of node) if (!isStatic(child)) return false;
    return true;
  }
  if (!isValidElement(node)) return false;
  const { type, props } = node as ReactElement<{ children?: unknown }>;
  return (typeof type === 'string' || type === Fragment) && isStatic(props.children);
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    let out = '';
    for (const child of node) out += textOf(child);
    return out;
  }
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}
