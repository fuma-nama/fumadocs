import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';

/** islands with `transition:persist` keep their slots on navigation, move in the content of the new page */
export function onBeforeSwap({ newDocument }: TransitionBeforeSwapEvent) {
  for (const island of document.querySelectorAll('astro-island[data-astro-transition-persist]')) {
    // like props, kept with `transition:persist-props`
    const persistProps = island.getAttribute('data-astro-transition-persist-props');
    if (persistProps !== null && persistProps !== 'false') continue;
    const id = CSS.escape(island.getAttribute('data-astro-transition-persist')!);
    const next = newDocument.querySelector(`astro-island[data-astro-transition-persist="${id}"]`);
    if (!next) continue;

    const current = slotsOf(island);
    const slots = slotsOf(next);
    let same = current.size === slots.size;
    for (const name of slots.keys()) if (!current.has(name)) same = false;
    if (!same) {
      // the island renders other slots, swap in the new island instead
      island.removeAttribute('data-astro-transition-persist');
      continue;
    }

    for (const [name, slot] of slots) {
      const target = current.get(name)!;
      if (target.innerHTML === slot.innerHTML) continue;
      target.replaceChildren(...slot.childNodes);
      // scripts of the new document don't run when moved
      for (const script of target.querySelectorAll('script')) {
        const copy = document.createElement('script');
        for (const { name, value } of script.attributes) copy.setAttribute(name, value);
        copy.text = script.text;
        script.replaceWith(copy);
      }
    }
  }
}

function slotsOf(island: Element): Map<string | null, Element> {
  const out = new Map<string | null, Element>();
  for (const slot of island.querySelectorAll('astro-slot')) {
    if (slot.closest('astro-island') === island) out.set(slot.getAttribute('name'), slot);
  }
  return out;
}
