import {
  createElement,
  Fragment,
  isValidElement,
  StrictMode,
  Suspense,
  type DOMAttributes,
  type FunctionComponent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { stringify } from 'devalue';
import { renderToStaticMarkup } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import { components } from 'virtual:fumadocs/components';
import type { ComponentBody, NodeBody } from './app';
import type { FumadocsIslandProps, IslandNode } from './island';
import { serializeIsland, Slot } from './mdx-runtime';
import type { ContentProps } from './ui/content';
import NodeContent from './ui/NodeContent.astro';

/** the props of `NodeContent.astro`, the island tree from {@link toPageBody} with the props of content */
export interface NodeContentProps extends Pick<FumadocsIslandProps, 'tree'>, ContentProps {
  /** static HTML, slot `s0` is the first */
  slots: string[];
}

/** the props of elements, as the serializer reads them */
interface ElementProps extends Pick<
  DOMAttributes<Element>,
  'children' | 'dangerouslySetInnerHTML'
> {
  [key: string]: unknown;
}

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
export async function toPageBody({ node, toc }: NodeBody): Promise<ComponentBody> {
  const tree: IslandNode[] = [];
  const slots: string[] = [];
  await serialize(node, tree, slots, false);
  return {
    component: NodeContent,
    props: { tree: serializeIsland(tree), slots } satisfies NodeContentProps,
    // serializable, like the TOC of MDX
    toc: toc?.map((item) => ({ ...item, title: textOf(item.title) })),
  };
}

/** add the island nodes of `node` to `out`, `pre` for the children of code blocks */
async function serialize(
  node: ReactNode,
  out: IslandNode[],
  slots: string[],
  pre: boolean,
): Promise<void> {
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
    out.push(String(node));
    return;
  }
  // `null`, booleans, and functions like render props
  if (typeof node !== 'object' || node === null) return;
  if ('then' in node) return serialize(await node, out, slots, pre);
  if (Symbol.iterator in node) {
    for (const child of node) await serialize(child, out, slots, pre);
    return;
  }
  if (!isValidElement<ElementProps>(node)) return;

  const { type, props } = node;
  if (type === Fragment || type === Suspense || type === StrictMode)
    return serialize(props.children, out, slots, pre);

  if (typeof type === 'string') {
    const { children, ...rest } = props;
    if (pre && type === 'code') {
      const { dangerouslySetInnerHTML: html, ...code } = rest;
      // highlighted code is rendered once by Astro, rather than also being in the island props
      if (html || isStatic(children)) {
        out.push([
          type,
          hostProps(code),
          slot(slots, html ? String(html.__html) : renderToStaticMarkup(children)),
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
    const islandProps = await toIslandProps(rest, slots);
    if (islandProps !== unserializable) {
      const nodes: IslandNode[] = [];
      await serialize(children, nodes, slots, name === 'pre');
      out.push([1, name, islandProps, ...nodes]);
      return;
    }
  }

  // other function components render on the server like server components, their output can have components
  if (isFunctionComponent(type)) {
    const result = await call(type, props);
    if (result) return serialize(await result.value, out, slots, pre);
  }

  // class components, `memo()`, context providers and the others are rendered by React
  out.push(slot(slots, await render(node)));
}

/** class components have `isReactComponent` on their prototype */
function isFunctionComponent(type: ReactElement['type']): type is FunctionComponent<ElementProps> {
  return typeof type === 'function' && !type.prototype?.isReactComponent;
}

/** call a function component in a render of React, so it can use hooks, `undefined` when it throws */
async function call(
  component: FunctionComponent<ElementProps>,
  props: ElementProps,
): Promise<{ value: ReturnType<FunctionComponent> } | undefined> {
  let result: { value: ReturnType<FunctionComponent> } | undefined;
  const element = createElement(() => {
    result = { value: component(props) };
    return null;
  });
  try {
    renderToStaticMarkup(createElement(Suspense, null, element));
    // it suspended, like `use()` of async data, React calls it again when the data is ready
    if (!result) await prerender(element, { onError() {} });
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

function slot(slots: string[], html: string): Slot {
  slots.push(html);
  return new Slot(`s${slots.length - 1}`);
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

/** a prop of a component in the island, elements render into slots */
async function toIslandProp(value: unknown, slots: string[]): Promise<unknown> {
  if (typeof value === 'function') return unserializable;
  if (typeof value !== 'object' || value === null) return value;
  if (isValidElement(value)) return slot(slots, await render(value));
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      const prop = await toIslandProp(item, slots);
      if (prop === unserializable) return unserializable;
      out.push(prop);
    }
    return out;
  }

  const prototype = Object.getPrototypeOf(value);
  // values of other classes like dates and maps, the component renders on the server when the island can't receive them
  if (prototype !== Object.prototype && prototype !== null)
    return isSerializable(value) ? value : unserializable;
  return toIslandProps(value, slots);
}

function isSerializable(value: object): boolean {
  try {
    stringify(value);
    return true;
  } catch {
    return false;
  }
}

/** the props of a component in the island */
async function toIslandProps(
  value: object,
  slots: string[],
): Promise<Record<string, unknown> | typeof unserializable> {
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const prop = await toIslandProp(item, slots);
    if (prop === unserializable) return unserializable;
    out[key] = prop;
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
  if (!isValidElement<ElementProps>(node)) return false;
  const { type, props } = node;
  return (typeof type === 'string' || type === Fragment) && isStatic(props.children);
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    let out = '';
    for (const child of node) out += textOf(child);
    return out;
  }
  if (isValidElement<ElementProps>(node)) return textOf(node.props.children);
  return '';
}
