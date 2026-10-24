import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';

/** islands with `transition:persist` keep their slots on navigation, move in the content of the new page */
export function onBeforeSwap({ newDocument }: TransitionBeforeSwapEvent) {
  for (const island of document.querySelectorAll('astro-island[data-astro-transition-persist]')) {
    const id = CSS.escape(island.getAttribute('data-astro-transition-persist')!);
    const next = newDocument.querySelector(`astro-island[data-astro-transition-persist="${id}"]`);
    if (!next) continue;

    for (const slot of next.querySelectorAll('astro-slot')) {
      if (
        slot.closest('astro-island') !== next ||
        !slot.querySelector('astro-island[component-export="FumadocsIsland"]')
      )
        continue;
      const name = slot.getAttribute('name');
      let target: Element | undefined;
      for (const item of island.querySelectorAll('astro-slot')) {
        if (item.closest('astro-island') === island && item.getAttribute('name') === name)
          target = item;
      }

      if (target) {
        target.replaceChildren(...slot.childNodes);
      } else {
        // not rendered by the island yet, Astro reads such slots from templates
        const template = document.createElement('template');
        template.setAttribute('data-astro-template', name ?? '');
        template.innerHTML = slot.innerHTML;
        island.append(template);
      }
    }
  }
}
