'use client';
import { Slot } from '@radix-ui/react-slot';
import { useEffect, useId, useRef, useState } from 'react';

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

  const inject = `{
function isEmpty(node) {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);
    if (child.nodeType === Node.TEXT_NODE) {
      return false;
    } else if (
      child.nodeType === Node.ELEMENT_NODE &&
      window.getComputedStyle(child).display !== 'none'
    ) {
      return false;
    }
  }

  return true;
}

const element = document.querySelector('[data-fdid="${id}"]')
if (element) {
  element.setAttribute('data-empty', String(isEmpty(element)))
}}`;

  return (
    <>
      <Slot
        ref={ref}
        data-fdid={id}
        data-empty={empty}
        className="data-[empty=true]:hidden"
        suppressHydrationWarning
      >
        {children}
      </Slot>
      {empty === undefined && (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: inject,
          }}
        />
      )}
    </>
  );
}
