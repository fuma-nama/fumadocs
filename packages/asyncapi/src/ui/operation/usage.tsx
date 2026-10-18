'use client';
import { useState } from 'react';
import { useTranslations } from '@fuma-translate/react';
import {
  exampleActions,
  exampleCodeBlock,
  ExampleSelect,
  selectCodeUsage,
  useCodeUsageId,
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

let defaultCodeUsages: CodeUsageGeneratorRegistry | undefined;

const storageKey = 'fumadocs-asyncapi-code-usage';

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
  const selected = useCodeUsageId(storageKey);
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
    <ClientCodeBlock
      lang={sample.lang}
      code={sample.code}
      codeblock={{
        ...exampleCodeBlock,
        title: selectMessage ? (
          <ExampleSelect
            items={messages.map((item) => ({
              value: item.id,
              label: <MessageName item={item} />,
              description: item.message.summary,
            }))}
            value={message.id}
            onValueChange={setMessageId}
            align="start"
            className="-ms-2 max-w-full text-fd-foreground"
          />
        ) : (
          t('Code Sample')
        ),
        Actions: exampleActions(
          <ExampleSelect
            items={samples}
            value={sample.value}
            onValueChange={(value) => selectCodeUsage(storageKey, value)}
          />,
        ),
      }}
    />
  );
}
