'use client';
import { type FC, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { Spinner } from 'shared-api/components/spinner';
import { useCodeUsage, useOperation, useResponseExamples } from '@/operation';
import type { PlaygroundResponse } from '@/playground/use-playground';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { Markdown } from '@/ui/components/markdown';
import { cn } from '@/utils/cn';
import {
  DefaultResultDisplay,
  PanelHeader,
  panelCodeBlock,
  type ResultDisplayProps,
} from './result-display';
import { Segmented, SegmentedList, SegmentedPanel } from '@/ui/components/segmented';

/** the code usages of the request, above its response or the documented examples */
export function ResponsePanel({
  response,
  loading,
  onReset,
  ResultDisplay = DefaultResultDisplay,
  className,
}: {
  response?: PlaygroundResponse;
  loading: boolean;
  onReset: () => void;
  ResultDisplay?: FC<ResultDisplayProps>;
  className?: string;
}) {
  const t = useTranslations({ note: 'playground' });

  return (
    <div className={cn('@container flex min-h-0 flex-col', className)}>
      <RequestExample />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {response ? (
          <ResultDisplay
            key={response.id}
            data={response.result}
            reset={onReset}
            className="starting:opacity-0 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:starting:translate-y-1"
          />
        ) : (
          <ResponseExamples />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-fd-card/70 text-sm text-fd-muted-foreground backdrop-blur-[1px] transition-opacity delay-150 duration-200 starting:opacity-0">
            <Spinner className="size-3.5" />
            {t('Sending request...')}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestExample() {
  const items = Array.from(useOperation().codeUsages.map());
  if (items.length === 0) return null;

  return (
    <CodeBlockTabs
      groupId="fumadocs_openapi_requests"
      defaultValue={items[0][0]}
      className="my-0 shrink-0 rounded-none border-0 border-b bg-transparent"
    >
      <CodeBlockTabsList className="h-10 items-stretch border-b [scrollbar-width:none]">
        {items.map(([id, item]) => (
          <CodeBlockTabsTrigger key={id} value={id}>
            {item.label ?? item.lang}
          </CodeBlockTabsTrigger>
        ))}
      </CodeBlockTabsList>
      {items.map(([id, item]) => (
        <CodeBlockTab key={id} value={id}>
          <UsageCode id={id} lang={item.lang} />
        </CodeBlockTab>
      ))}
    </CodeBlockTabs>
  );
}

function UsageCode({ id, lang }: { id: string; lang: string }) {
  const code = useCodeUsage(id);
  if (!code) return null;

  return (
    <ClientCodeBlock
      lang={lang}
      code={code}
      codeblock={{
        className: 'rounded-none border-0 bg-transparent shadow-none',
        viewportProps: { className: 'max-h-[min(18rem,30vh)]' },
      }}
    />
  );
}

function ResponseExamples() {
  const t = useTranslations({ note: 'playground' });
  const tabs = useResponseExamples();
  const [code, setCode] = useState<string>();
  const [selected, setSelected] = useState(0);

  if (tabs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-xl border bg-fd-secondary p-2.5 text-fd-muted-foreground">
          <SendHorizontal className="size-4" />
        </div>
        <p className="text-sm text-fd-muted-foreground">
          {t('Send a request to see its response.')}
        </p>
      </div>
    );
  }

  const tab = tabs.find((item) => item.code === code) ?? tabs[0];
  const examples = tab.examples ?? [];
  const example = examples[selected];

  return (
    <Segmented
      value={tab.code}
      onValueChange={(value: string) => {
        setCode(value);
        setSelected(0);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <PanelHeader>
        <span className="shrink-0 text-[0.8125rem] font-medium">{t('Response')}</span>
        <div
          title={tab.response.description}
          className="min-w-0 flex-1 truncate text-xs text-fd-muted-foreground [&_*]:inline [&_a]:underline"
        >
          {tab.response.description && <Markdown md={tab.response.description} />}
        </div>
        {examples.length > 1 && (
          <Select
            items={examples.map((item, i) => ({ value: String(i), label: item.label }))}
            value={String(selected)}
            onValueChange={(v) => v !== null && setSelected(Number(v))}
          >
            <SelectTrigger className="h-7 w-auto max-w-40 shrink-0 gap-1.5 border-0 bg-transparent px-2 text-xs hover:bg-fd-accent focus:ring-0 focus-visible:ring-2">
              <SelectValue className="truncate" />
            </SelectTrigger>
            <SelectContent align="end">
              {examples.map((item, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <SegmentedList
          className="max-w-1/2 shrink-0 overflow-x-auto [scrollbar-width:none]"
          items={tabs.map((item) => ({
            value: item.code,
            label: <span className="font-mono">{item.code}</span>,
          }))}
        />
      </PanelHeader>
      <SegmentedPanel
        key={tab.code}
        value={tab.code}
        className="flex min-h-0 flex-1 flex-col overflow-auto"
      >
        {example ? (
          <div className="min-h-0 flex-1">
            <ClientCodeBlock
              lang="json"
              code={JSON.stringify(example.sample, null, 2)}
              codeblock={panelCodeBlock}
            />
          </div>
        ) : (
          <p className="p-4 text-sm text-fd-muted-foreground">{t('No example available.')}</p>
        )}
      </SegmentedPanel>
    </Segmented>
  );
}
