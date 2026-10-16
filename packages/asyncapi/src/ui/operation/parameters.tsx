'use client';
import { useTranslations } from '@fuma-translate/react';
import { dereference } from '@fumadocs/json-schema';
import { AnchorSection } from 'shared-api/auto-anchor';
import { useOperation } from '@/operation';
import type { AsyncAPISchemaObject, HttpOperationBinding, WsChannelBinding } from '@/types';
import { SchemaUI } from '@/ui/components/schema';
import { useBindings } from '@/ui/bindings';
import { SectionHeader } from './section';

/**
 * The parameters of channel address, and the query and headers of connections from the bindings of the selected server.
 */
export function ParametersSection({ headingLevel }: { headingLevel: number }) {
  const t = useTranslations({ note: 'operation page' });
  const { parameters, channel, operation } = useOperation();
  const ws = useBindings(channel.bindings).get('ws') as WsChannelBinding | undefined;
  const http = useBindings(operation.bindings).get('http') as HttpOperationBinding | undefined;

  return (
    <>
      {parameters.length > 0 && (
        <>
          <SectionHeader id="parameters" depth={headingLevel} title={t('Address Parameters')} />
          <AnchorSection segments={['parameters']}>
            <div className="rounded-xl border bg-fd-card px-3">
              {parameters.map(({ name, parameter, schema }) => {
                let root = schema;
                if (parameter.location) {
                  const note = t('Its value is at {location} of messages.', {
                    variables: { location: `\`${parameter.location}\`` },
                  });
                  root = {
                    ...(schema as object),
                    description: parameter.description
                      ? `${parameter.description}\n\n${note}`
                      : note,
                  };
                }

                return <SchemaUI key={name} client={{ name, required: true }} root={root} />;
              })}
            </div>
          </AnchorSection>
        </>
      )}
      <ObjectParameters
        id="query"
        title={t('Query Parameters')}
        schema={ws?.query ?? http?.query}
        headingLevel={headingLevel}
      />
      <ObjectParameters
        id="headers"
        title={t('Handshake Headers')}
        schema={ws?.headers}
        headingLevel={headingLevel}
      />
    </>
  );
}

/** the properties of an object schema as parameters */
function ObjectParameters({
  id,
  title,
  schema,
  headingLevel,
}: {
  id: string;
  title: string;
  schema: AsyncAPISchemaObject | undefined;
  headingLevel: number;
}) {
  const resolved = dereference(schema);
  if (typeof resolved !== 'object' || !resolved?.properties) return null;
  const required = resolved.required ?? [];

  return (
    <>
      <SectionHeader id={id} depth={headingLevel} title={title} />
      <AnchorSection segments={[id]}>
        <div className="rounded-xl border bg-fd-card px-3">
          {Object.entries(resolved.properties).map(([name, property]) => (
            <SchemaUI
              key={name}
              client={{ name, required: required.includes(name) }}
              root={property as never}
            />
          ))}
        </div>
      </AnchorSection>
    </>
  );
}
