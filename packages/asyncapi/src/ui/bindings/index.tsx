'use client';
import type { ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { dereference } from '@fumadocs/json-schema';
import { isPlainObject } from 'shared-api/utils/is-plain-object';
import { cn } from '@/utils/cn';
import { useOperation } from '@/operation';
import { useServer } from '@/utils/use-server';
import { getBindingKey } from '@/utils/server-url';
import { SectionHeader } from '@/ui/operation/section';
import { getProtocolBinding } from './protocols';
import type { BindingComponent } from './shared';

type Bindings = Record<string, unknown>;

/** the bindings that apply to the selected server, specification extensions excluded */
export function useBindings(bindings: unknown): Map<string, Bindings> {
  const { server, servers } = useServer();
  const schema = server ? servers[server.id] : undefined;
  const protocol = schema && getBindingKey(schema.protocol);
  const out = new Map<string, Bindings>();

  for (const [key, value] of Object.entries(dereference(bindings) ?? {})) {
    if (key.startsWith('x-') || !isPlainObject(value)) continue;
    if (protocol && key !== protocol && !(protocol === 'mqtt' && key === 'mqtt5')) continue;
    out.set(key, dereference(value));
  }

  return out;
}

/** a group of binding rows, hidden when the protocol has nothing to show readers */
function Group({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="hidden has-[dd]:block">
      <p className="px-3 pt-2.5 pb-1 text-xs font-medium text-fd-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

const cardClassName =
  'not-prose @container overflow-hidden rounded-xl border bg-fd-card text-fd-card-foreground [&>:has(dd)~:has(dd)]:border-t';

/**
 * The protocol details of the operation for the selected server: bindings of its server, channel and operation.
 */
export function ProtocolSection({ headingLevel }: { headingLevel: number }) {
  const t = useTranslations({ note: 'bindings' });
  const { operation, channel } = useOperation();
  const { server, servers } = useServer();
  const levels = [
    { title: t('Server'), bindings: useBindings(server && servers[server.id]?.bindings) },
    { title: t('Channel'), bindings: useBindings(channel.bindings) },
    { title: t('Operation'), bindings: useBindings(operation.bindings) },
  ] as const;
  const protocols = new Set<string>();
  for (const level of levels) for (const key of level.bindings.keys()) protocols.add(key);

  return Array.from(protocols, (protocol) => {
    const definition = getProtocolBinding(protocol);
    const components: BindingComponent[] = [
      definition.Server,
      definition.Channel,
      definition.Operation,
    ];

    return (
      <section key={protocol} className="mt-10 hidden first:mt-0 has-[dd]:block">
        <SectionHeader id={`protocol-${protocol}`} depth={headingLevel} title={definition.label} />
        <div className={cardClassName}>
          {levels.map(({ title, bindings }, i) => {
            const binding = bindings.get(protocol);
            const Component = components[i];

            return (
              binding && (
                <Group key={i} title={title}>
                  <Component binding={binding} />
                </Group>
              )
            );
          })}
        </div>
      </section>
    );
  });
}

/** the bindings of a message for the selected server */
export function MessageBindings({ bindings }: { bindings: unknown }) {
  const resolved = useBindings(bindings);

  return Array.from(resolved, ([protocol, binding]) => {
    const { label, Message } = getProtocolBinding(protocol);

    return (
      <div key={protocol} className={cn(cardClassName, 'hidden has-[dd]:block')}>
        <p className="px-3 pt-2.5 pb-1 text-xs font-medium text-fd-muted-foreground">{label}</p>
        <Message binding={binding} />
      </div>
    );
  });
}
