'use client';
import React from 'react';

const isEmpty = (node: HTMLElement) => {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);

    if (
      child.nodeType === Node.TEXT_NODE ||
      (child.nodeType === Node.ELEMENT_NODE &&
        window.getComputedStyle(child as HTMLElement).display !== 'none')
    ) {
      return false;
    }
  }

  return true;
};

/**
 * The built-in CSS `:empty` selector cannot detect if the children is hidden, classes such as `md:hidden` causes it to fail.
 * This component is an enhancement to `empty:hidden` to fix the issue described above.
 *
 * This can be expensive, please avoid this whenever possible.
 */
export function HideIfEmpty({ children }: { children: React.ReactNode }) {
  const id = React.useId();
  const [empty, setEmpty] = React.useState<boolean | undefined>();

  React.useEffect(() => {
    const element = document.querySelector(
      `[data-fdid="${id}"]`,
    ) as HTMLElement | null;
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
  }, [id]);

  let child;
  if (React.isValidElement(children)) {
    child = React.cloneElement(children, {
      ...(children.props as object),
      'data-fdid': id,
      'data-empty': empty,
      suppressHydrationWarning: true,
    } as object);
  } else {
    child =
      React.Children.count(children) > 1 ? React.Children.only(null) : null;
  }

  return (
    <>
      {child}
      {empty === undefined && (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `{
const element = document.querySelector('[data-fdid="${id}"]')
if (element) {
  element.setAttribute('data-empty', String((${isEmpty.toString()})(element)))
}}`,
          }}
        />
      )}
    </>
  );
}
