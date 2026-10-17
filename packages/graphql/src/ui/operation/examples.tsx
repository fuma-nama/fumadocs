'use client';
import type { ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import {
  captionedCodeBlock,
  cardCodeBlock,
  exampleCardClassName,
  ExampleHeader,
  ExampleSelect,
} from 'shared-api/components/example';
import { useOperation } from '@/operation';
import { useRenderContext } from '@/utils/create-page';
import type { OperationExample } from '@/utils/example';
import {
  codeUsageHeaders,
  selectCodeUsage,
  useCodeUsageId,
  useEndpointUrl,
} from '@/ui/components/code-usage';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { Markdown } from '@/ui/components/markdown';

/** the code usage of the GraphQL document itself */
const graphqlId = 'graphql';

/** the query scrolls before its variables */
const variablesCodeBlock = {
  ...captionedCodeBlock,
  viewportProps: { className: 'pt-2 max-h-60' },
};

/** the request of the selected example and its response */
export function OperationExamples() {
  const t = useTranslations({ note: 'operation page' });
  const { examples, selected } = useOperation();
  const example = examples.at(selected);
  if (!example) return null;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <RequestExample example={example} />
      {example.response !== undefined && (
        <div className={exampleCardClassName}>
          <ExampleHeader title={t('Example Response')} />
          <ClientCodeBlock
            lang="json"
            code={JSON.stringify(example.response, null, 2)}
            codeblock={cardCodeBlock}
          />
        </div>
      )}
    </div>
  );
}

function RequestExample({ example }: { example: OperationExample }) {
  const t = useTranslations({ note: 'operation page' });
  const { codeUsages, playground } = useRenderContext();
  const { kind, examples, selected, select } = useOperation();
  const url = useEndpointUrl(playground?.url);
  const id = useCodeUsageId();
  const generators = codeUsages.map();
  const languages = [{ value: graphqlId, label: 'GraphQL' }];
  let value = graphqlId;
  // code samples send HTTP POST requests, which subscriptions don't use
  if (kind !== 'subscription') {
    for (const [key, item] of generators)
      languages.push({ value: key, label: item.label ?? item.lang });
    if (id !== null && generators.has(id)) value = id;
  }
  const generator = generators.get(value);

  let body: ReactNode;
  if (generator) {
    const headers = codeUsageHeaders(playground?.headers);

    body = (
      <ClientCodeBlock
        lang={generator.lang}
        code={generator.generate(
          { url, query: example.query, variables: example.variables, headers },
          undefined,
        )}
        codeblock={cardCodeBlock}
      />
    );
  } else {
    body = (
      <>
        <ClientCodeBlock lang="graphql" code={example.query} codeblock={cardCodeBlock} />
        {example.variables !== undefined && (
          <div className="flex shrink-0 flex-col border-t">
            <div className="px-4 pt-3 text-xs font-medium text-fd-muted-foreground">
              {t('Variables')}
            </div>
            <ClientCodeBlock
              lang="json"
              code={JSON.stringify(example.variables, null, 2)}
              codeblock={variablesCodeBlock}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className={exampleCardClassName}>
      <div className="shrink-0 border-b ps-4 pe-1.5">
        <div className="flex h-10 items-center gap-2 text-[0.8125rem] font-medium">
          {examples.length > 1 ? (
            <ExampleSelect
              items={examples.map((item, i) => ({
                value: String(i),
                label: item.name ?? t('Example Request'),
                description: item.description && <Markdown md={item.description} />,
              }))}
              value={String(selected)}
              onValueChange={(v) => select(Number(v))}
              align="start"
              className="-ms-2 me-auto max-w-none min-w-0 shrink text-fd-foreground"
            />
          ) : (
            <span className="me-auto truncate">{example.name ?? t('Example Request')}</span>
          )}
          {languages.length > 1 ? (
            <ExampleSelect items={languages} value={value} onValueChange={selectCodeUsage} />
          ) : (
            <span className="px-2 text-fd-muted-foreground">{languages[0].label}</span>
          )}
        </div>
        {example.description && (
          <div className="-mt-1.5 pe-2.5 pb-2.5 prose prose-xs prose-no-margin text-fd-muted-foreground">
            <Markdown md={example.description} />
          </div>
        )}
      </div>
      {body}
    </div>
  );
}
