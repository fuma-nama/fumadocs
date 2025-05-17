'use client';
import { Slot } from '@radix-ui/react-slot';
import { useEffect, useId, useRef, useState } from 'react';

const init = `function isEmpty(node) {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);
    if (child.nodeType === Node.TEXT_NODE) {
      return false
    } else if (
      child.nodeType === Node.ELEMENT_NODE &&
      window.getComputedStyle(child).display !== 'none'
    ) {
      return false
    }
  }

  return true;
}`;

function isEmpty(node: HTMLElement) {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);
    if (child.nodeType === Node.TEXT_NODE) {
      return false;
    } else if (
      child.nodeType === Node.ELEMENT_NODE &&
      window.getComputedStyle(child as HTMLElement).display !== 'none'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * The built-in CSS `:empty` selector cannot detect if the children is hidden, classes such as `md:hidden` causes it to fail.
 * This component is an enhancement to `empty:hidden` to fix the issue described above.
 *
 * This can be expensive, please avoid this whenever possible.
 */
export function HideIfEmpty({ children }: { children: React.ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState<boolean | undefined>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onUpdate = () => {
      setEmpty(isEmpty(element));
    };

    const observer = new ResizeObserver(onUpdate);
    observer.observe(element);
    onUpdate();
    return () => {
      observer.disconnect();
    };
  }, []);

  const inject = `
${init}
const element = document.querySelector('[data-hide-if-empty="${id}"]')
if (element) {
  element.setAttribute('data-empty', String(isEmpty(element)))
}`;

  return (
    <>
      {empty === undefined && <script>{`{ ${inject} }`}</script>}
      <Slot
        ref={ref}
        data-hide-if-empty={id}
        data-empty={empty}
        className="data-[empty=true]:hidden"
      >
        {children}
      </Slot>
    </>
  );
}
