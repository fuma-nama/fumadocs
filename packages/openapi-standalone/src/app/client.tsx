import './styles.css';
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { hydrateRoot } from 'react-dom/client';
import type { Router } from 'fumadocs-core/framework';
import { deserializePageTree } from 'fumadocs-core/source/client';
import type { Document } from 'fumadocs-openapi';
import { App, normalizePathname } from '.';
import type { SiteData } from './types';

declare global {
  /** URL of the site data, written by the server */
  var __fumadocs: string;
}

const site: SiteData = await (await fetch(globalThis.__fumadocs)).json();
const tree = deserializePageTree(site.tree);
/** URL -> bundled document */
const documents = new Map<string, Document>();
const listeners = new Set<() => void>();
let pathname = normalizePathname(location.pathname);
let navigation = 0;

async function loadPage(pathname: string) {
  const page = site.pages[pathname];
  if (page?.type !== 'api') return;

  const url = site.documents[page.props.document];
  if (!documents.has(url)) documents.set(url, await (await fetch(url)).json());
}

async function go(url: URL, push: boolean) {
  const next = normalizePathname(url.pathname);
  if (url.origin !== location.origin || !(next in site.pages)) return location.assign(url);
  if (push && url.pathname === location.pathname && url.hash) {
    location.hash = url.hash;
    return;
  }

  const id = ++navigation;
  try {
    await loadPage(next);
  } catch {
    return location.assign(url);
  }
  if (id !== navigation) return;

  if (push) history.pushState(null, '', url);
  pathname = next;
  flushSync(() => {
    for (const listener of listeners) listener();
  });
  if (!push) return;

  const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
}

const router: Router = {
  push: (href) => go(new URL(href, location.href), true),
  refresh() {},
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getPathname() {
  return pathname;
}

function Client() {
  return (
    <App
      site={site}
      tree={tree}
      pathname={useSyncExternalStore(subscribe, getPathname, getPathname)}
      router={router}
      getDocument={(name) => documents.get(site.documents[name])!}
    />
  );
}

window.addEventListener('popstate', () => void go(new URL(location.href), false));
await loadPage(pathname);
hydrateRoot(document, <Client />);
