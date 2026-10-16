'use client';
import { useTranslations } from '@fuma-translate/react';
import { dereference } from '@fumadocs/json-schema';
import { isPlainObject } from 'shared-api/utils/is-plain-object';
import { useOperation } from '@/operation';
import { useServer } from '@/utils/use-server';
import { getBindingKey } from '@/utils/server-url';
import { SectionHeader } from '@/ui/operation/section';
import { getProtocolBinding } from './protocols';

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

const cardClassName =
  'not-prose @container overflow-hidden rounded-xl border bg-fd-card text-fd-card-foreground [&>:has(dd)~:has(dd)]:border-t';

const titleClassName = 'px-3 pt-2.5 pb-1 text-xs font-medium text-fd-muted-foreground';

/**
 * The protocol details of the operation for the selected server: bindings of its server, channel and operation.
 *
 * Bindings with nothing to show readers are hidden, by the absence of fields (`dd`) in them.
 */
export function ProtocolSection({ headingLevel }: { headingLevel: number }) {
  const t = useTranslations({ note: 'bindings' });
  const { operation, channel } = useOperation();
  const { server, servers } = useServer();
  const levels = [
    {
      key: 'Server',
      title: t('Server'),
      bindings: useBindings(server && servers[server.id]?.bindings),
    },
    { key: 'Channel', title: t('Channel'), bindings: useBindings(channel.bindings) },
    { key: 'Operation', title: t('Operation'), bindings: useBindings(operation.bindings) },
  ] as const;
  const protocols = new Set<string>();
  for (const { bindings } of levels)
    for (const protocol of bindings.keys()) protocols.add(protocol);

  return Array.from(protocols, (protocol) => {
    const definition = getProtocolBinding(protocol);

    return (
      <section key={protocol} className="mt-10 hidden first:mt-0 has-[dd]:block">
        <SectionHeader id={`protocol-${protocol}`} depth={headingLevel} title={definition.label} />
        <div className={cardClassName}>
          {levels.map(({ key, title, bindings }) => {
            const binding = bindings.get(protocol);
            if (!binding) return;
            const Component = definition[key];

            return (
              <div key={key} className="hidden has-[dd]:block">
                <p className={titleClassName}>{title}</p>
                <Component binding={binding} />
              </div>
            );
          })}
        </div>
      </section>
    );
  });
}

/** the bindings of a message for the selected server */
export function MessageBindings({ bindings }: { bindings: unknown }) {
  return Array.from(useBindings(bindings), ([protocol, binding]) => {
    const { label, Message } = getProtocolBinding(protocol);

    return (
      <div key={protocol} className={`${cardClassName} hidden has-[dd]:block`}>
        <p className={titleClassName}>{label}</p>
        <Message binding={binding} />
      </div>
    );
  });
}
