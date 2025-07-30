'use client';
import {
  createContext,
  type FC,
  type HTMLAttributes,
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

function getElement(id: string) {
  return document.querySelector<HTMLElement>(`[data-fd-if-empty="${id}"]`);
}

function isEmpty(node: HTMLElement) {
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
}

/**
 * The built-in CSS `:empty` selector cannot detect if the children is hidden, classes such as `md:hidden` causes it to fail.
 * This component is an enhancement to `empty:hidden` to fix the issue described above.
 *
 * This can be expensive, please avoid this whenever possible.
 */
export function HideIfEmpty<Props extends HTMLAttributes<HTMLElement>>({
  as: Comp,
  ...props
}: Props & {
  as: FC<Props>;
}) {
  const id = useId();
  const { nonce } = useContext(Context);
  const [empty, setEmpty] = useState(() => {
    const element = typeof window !== 'undefined' ? getElement(id) : null;
    if (element) return isEmpty(element);
  });

  useEffect(() => {
    const handleResize = () => {
      const element = getElement(id);
      if (element) setEmpty(isEmpty(element));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  const init = (id: string) => {
    const element = getElement(id);
    if (element) element.hidden = isEmpty(element);

    const script = document.currentScript;
    if (script) script.parentNode?.removeChild(script);
  };

  return (
    <>
      <Comp
        {...(props as unknown as Props)}
        data-fd-if-empty={id}
        hidden={empty ?? false}
      />
      {empty === undefined && (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `{${getElement};${isEmpty};(${init})("${id}")}`,
          }}
        />
      )}
    </>
  );
}
