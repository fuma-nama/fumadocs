'use client';
import {
  cloneElement,
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';

const Context = createContext({
  nonce: undefined as string | undefined,
});

export function HideIfEmptyProvider({
  nonce,
  children,
}: {
  nonce?: string;
  children: ReactNode;
}) {
  return (
    <Context.Provider value={useMemo(() => ({ nonce }), [nonce])}>
      {children}
    </Context.Provider>
  );
}

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
export function HideIfEmpty({ children }: { children: ReactNode }) {
  const id = useId();
  const [empty, setEmpty] = useState<boolean | undefined>();
  const { nonce } = useContext(Context);

  useEffect(() => {
    const handleResize = () => {
      const element = document.querySelector(`[data-fd-if-empty="${id}"]`);
      if (!element || !(element instanceof HTMLElement)) return;
      setEmpty(isEmpty(element));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  let child;
  if (isValidElement(children)) {
    child = cloneElement(children, {
      ...(children.props as object),
      'data-fd-if-empty': id,
      'data-empty': empty,
      suppressHydrationWarning: true,
    } as object);
  } else {
    throw new Error('expected to receive a single React element child.');
  }

  return (
    <>
      {child}
      {empty === undefined && (
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `{
const element = document.querySelector('[data-fd-if-empty="${id}"]')
if (element) {
  element.setAttribute('data-empty', String((${isEmpty.toString()})(element)))
}}`,
          }}
        />
      )}
    </>
  );
}
