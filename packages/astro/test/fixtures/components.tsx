import { createContext, type ReactNode, use } from 'react';

const TabsContext = createContext<string | null>(null);

function Tabs({ items, children }: { items: string[]; children: ReactNode }) {
  return (
    <TabsContext value={items[0]}>
      <div data-tabs={items.join(',')}>{children}</div>
    </TabsContext>
  );
}

function Tab({ value, children }: { value: string; children: ReactNode }) {
  const active = use(TabsContext);
  if (active === null) throw new Error('Tab must be inside Tabs');
  return <section data-active={active === value}>{children}</section>;
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <a data-card={title}>
      {icon}
      {children}
    </a>
  );
}

export default {
  Tabs,
  Tab,
  Card,
  UI: { Badge: ({ children }: { children: ReactNode }) => <mark>{children}</mark> },
  pre: (props: { children: ReactNode }) => <pre data-codeblock="">{props.children}</pre>,
  wrapper: ({ lang, children }: { lang?: string; children: ReactNode }) =>
    lang ? <main lang={lang}>{children}</main> : children,
};
