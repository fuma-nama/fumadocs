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

function disableAnimation() {
  const css = document.createElement('style');
  const nonce = document.currentScript?.nonce;
  if (nonce) css.setAttribute('nonce', nonce);
  css.appendChild(
    document.createTextNode(
      `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`,
    ),
  );
  document.head.appendChild(css);

  return () => {
    // Force restyle
    (() => window.getComputedStyle(document.body))();

    // Wait for next tick before removing
    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  };
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
    if (element) {
      disableAnimation();
      element.hidden = isEmpty(element);
    }
  };

  return (
    <>
      <Comp
        {...(props as unknown as Props)}
        data-fd-if-empty={id}
        hidden={empty ?? false}
      />
      <script
        suppressHydrationWarning
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `{${getElement};${isEmpty};${disableAnimation};(${init})("${id}")}`,
        }}
      />
    </>
  );
}
