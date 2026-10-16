'use client';
import { useState, useSyncExternalStore } from 'react';
import { useTranslations } from '@fuma-translate/react';
import {
  cardCodeBlock,
  exampleCardClassName,
  ExampleHeader,
  ExampleSelect,
} from 'shared-api/components/example';
import { useOperation, useOperationSecurity } from '@/operation';
import { useRenderContext } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import {
  fillVariables,
  getBindingKey,
  getUrlParts,
  isUrlProtocol,
  resolveServerUrl,
} from '@/utils/server-url';
import {
  type CodeUsageData,
  type CodeUsageGeneratorRegistry,
  createCodeUsageGeneratorRegistry,
  registerDefaultCodeUsages,
  withCodeSamples,
} from '@/codegen';
import { useBindings } from '@/ui/bindings';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { MessageName } from '@/ui/components/message-name';
import { cn } from '@/utils/cn';

let defaultCodeUsages: CodeUsageGeneratorRegistry | undefined;

// the selected language applies to every code sample of the session
const storageKey = 'fumadocs-asyncapi-code-usage';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function select(id: string) {
  sessionStorage.setItem(storageKey, id);
  for (const listener of listeners) listener();
}

/** code samples of the operation for the selected server, with a select of their languages */
export function CodeUsages() {
  const t = useTranslations({ note: 'operation page' });
  const registry =
    useRenderContext().codeUsages ??
    (defaultCodeUsages ??= registerDefaultCodeUsages(createCodeUsageGeneratorRegistry()));
  const { action, operation, channel, parameters, messages } = useOperation();
  const security = useOperationSecurity();
  const { servers, server } = useServer();
  const [messageId, setMessageId] = useState<string>();
  const selected = useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(storageKey),
    () => null,
  );
  const schema = server ? servers[server.id] : undefined;
  const key = schema ? getBindingKey(schema.protocol) : '';
  const message = messages.find((item) => item.id === messageId) ?? messages[0];
  const bindings = {
    server: useBindings(schema?.bindings).get(key),
    channel: useBindings(channel.bindings).get(key),
    operation: useBindings(operation.bindings).get(key),
    message: useBindings(message?.message.bindings).get(key),
  };
  if (!server || !schema) return null;

  const values: Record<string, string> = {};
  for (const { name, parameter } of parameters) {
    const value = parameter.default ?? parameter.examples?.[0] ?? parameter.enum?.[0];
    if (value !== undefined) values[name] = value;
  }
  const address = fillVariables(channel.address ?? '', values);
  let url: string | undefined;
  if (isUrlProtocol(schema.protocol)) {
    const query = new URLSearchParams();
    // one API key in the query for the server, and one for the operation
    for (const items of [security.server, security.operation]) {
      const { scheme } = items.find((item) => item.scheme.in === 'query') ?? {};
      if (scheme?.name) query.set(scheme.name, 'YOUR_API_KEY');
    }
    url = getUrlParts(schema, server.variables, address).join('');
    if (query.size > 0) url += `?${query}`;
  }

  const example = message?.examples[0];
  const data: CodeUsageData = {
    protocol: schema.protocol,
    server: resolveServerUrl(schema, server.variables),
    address,
    received: action === 'send',
    message: message && {
      name: message.name,
      contentType: message.contentType,
      headers: example?.headers,
      payload: example?.payload,
    },
    bindings,
  };
  const samples: { value: string; label: string; lang: string; code: string }[] = [];
  for (const [id, generator] of withCodeSamples(registry, operation).map()) {
    const code = generator.generate(data, { url });
    if (code)
      samples.push({
        value: id,
        label: generator.label ?? generator.lang,
        lang: generator.lang,
        code,
      });
  }
  if (samples.length === 0) return null;

  const sample = samples.find((item) => item.value === selected) ?? samples[0];
  const selectMessage = !data.received && messages.length > 1;

  return (
    <div className={cn(exampleCardClassName, 'not-prose my-6')}>
      <ExampleHeader title={!selectMessage && t('Code Sample')}>
        {selectMessage && (
          <ExampleSelect
            items={messages.map((item) => ({
              value: item.id,
              label: <MessageName item={item} />,
              description: item.message.summary,
            }))}
            value={message.id}
            onValueChange={setMessageId}
            align="start"
            className="-ms-2 me-auto max-w-none min-w-0 shrink text-fd-foreground"
          />
        )}
        {samples.length > 1 ? (
          <ExampleSelect items={samples} value={sample.value} onValueChange={select} />
        ) : (
          <span className="px-2 text-fd-muted-foreground">{sample.label}</span>
        )}
      </ExampleHeader>
      <ClientCodeBlock lang={sample.lang} code={sample.code} codeblock={cardCodeBlock} />
    </div>
  );
}
