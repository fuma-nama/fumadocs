'use client';
import {
  type ComponentProps,
  createContext,
  type FC,
  Fragment,
  type ReactNode,
  use,
  useState,
} from 'react';
import {
  ArrowLeft,
  Braces,
  ChevronRight,
  Cookie,
  KeyRound,
  type LucideIcon,
  PlusIcon,
  Route,
  Rows3,
  SlidersHorizontal,
} from 'lucide-react';
import { type FieldKey, useDataEngine, useFieldValue } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import type { JsonSchema } from '@fumadocs/json-schema';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  anyFields,
  useResolvedSchema,
  useSchemaUtils,
} from 'shared-api/components/playground/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { type AuthField, type AuthPanelProps, type AuthRenderProps } from '@/playground/auth';
import type { Playground, PlaygroundAuth, RequestBodyInfo } from '@/playground/use-playground';
import { type OperationParameters, useOperation } from '@/operation';
import type { ParameterObject } from '@/types';
import { cn } from '@/utils/cn';
import {
  type FieldEntry,
  FieldRow,
  FieldRows,
  getNestedFields,
  getRemoval,
  LinkRow,
  type NavigateFn,
  resolveField,
  ValueRow,
} from './fields';
import { Segmented, SegmentedList } from '@/ui/components/segmented';

interface RenderOptions {
  renderParameterField?: (fieldName: FieldKey, param: ParameterObject) => ReactNode;
  renderBodyField?: (fieldName: 'body', info: RequestBodyInfo) => ReactNode;
}

const sectionIcons: Record<OperationParameters['in'], LucideIcon> = {
  path: Route,
  query: SlidersHorizontal,
  header: Rows3,
  cookie: Cookie,
};

/** into a nested field, out of it, or to its next/previous sibling */
type Motion = 'forward' | 'back' | 'next' | 'previous';

const motionClassNames: Record<Motion, string> = {
  forward: 'motion-safe:starting:translate-x-6',
  back: 'motion-safe:starting:-translate-x-6',
  next: 'motion-safe:starting:translate-y-4',
  previous: 'motion-safe:starting:-translate-y-4',
};

const transitionClassName =
  'motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]';

interface AuthTarget {
  field: AuthField;
  component: FC<AuthPanelProps>;
}

/** the overview of all request inputs, nested fields open in their own panel */
export function RequestPanel({
  playground: { auth, body },
  onSubmit,
  className,
  ...options
}: RenderOptions & {
  playground: Playground;
  onSubmit: (e: { preventDefault: () => void }) => void;
  className?: string;
}) {
  const t = useTranslations({ note: 'playground' });
  const engine = useDataEngine();
  const { generateDefault } = useSchemaUtils();
  const [stack, setStack] = useState<FieldEntry[]>([]);
  const [authorizing, setAuthorizing] = useState<AuthTarget | null>(null);
  const [motion, setMotion] = useState<Motion>('forward');
  const current = stack.at(-1);
  const sectionNames: Record<string, string> = {
    path: t('Path'),
    query: t('Query'),
    header: t('Header'),
    cookie: t('Cookies'),
    body: t('Body'),
  };

  function navigate(next: FieldEntry[], nextMotion?: Motion) {
    const target = next.at(-1);
    if (target)
      engine.init(target.fieldName, () => {
        const field = resolveField(target.schema, undefined);
        return field ? generateDefault(field) : undefined;
      });
    setMotion(nextMotion ?? (next.length >= stack.length ? 'forward' : 'back'));
    setStack(next);
  }

  function openNested(parents: FieldEntry[]): NavigateFn {
    return (entry, siblings) =>
      navigate([...parents, { ...entry, siblings: getNestedFields(engine, siblings) }]);
  }

  let panel: ReactNode = null;
  if (authorizing) {
    const { field, component: Component } = authorizing;
    const close = () => setAuthorizing(null);

    panel = (
      <Panel
        id="auth"
        motion="forward"
        nav={
          <PanelNav root={t('Authorization')} onRoot={close} onBack={close}>
            <Crumb>
              <span aria-current="page" className="truncate px-1.5 py-1 font-mono font-medium">
                {field.schemeId}
              </span>
            </Crumb>
          </PanelNav>
        }
      >
        <Component field={field} close={close} />
      </Panel>
    );
  } else if (current) {
    panel = (
      <Panel
        id={stringifyFieldKey(current.fieldName)}
        motion={motion}
        nav={
          <Breadcrumbs
            root={sectionNames[stack[0].fieldName[0]]}
            stack={stack}
            onNavigate={navigate}
          />
        }
      >
        <FieldRows entry={current} showDescription onNavigate={openNested(stack)} />
      </Panel>
    );
  }

  // the overview stays under panels, keeping its scroll position, auth panels are outside the request form
  return (
    <div className={cn('@container grid min-h-0', className)}>
      <form noValidate className="contents" onSubmit={onSubmit}>
        <div
          className={cn(
            'fd-scroll-container min-h-0 overflow-y-auto [grid-area:1/1]',
            transitionClassName,
            panel && 'invisible opacity-0 motion-safe:-translate-x-6',
          )}
        >
          <Overview
            {...options}
            auth={auth}
            body={body}
            sectionNames={sectionNames}
            onNavigate={openNested([])}
            onAuthorize={setAuthorizing}
          />
        </div>
        {!authorizing && panel}
      </form>
      {authorizing && panel}
    </div>
  );
}

/** a panel over the overview, its content animates in when `id` changes */
function Panel({
  id,
  motion,
  nav,
  children,
}: {
  id: string;
  motion: Motion;
  nav: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col [grid-area:1/1]">
      {nav}
      <div
        key={id}
        className={cn(
          'fd-scroll-container min-h-0 flex-1 overflow-y-auto starting:opacity-0',
          transitionClassName,
          motionClassNames[motion],
        )}
      >
        {children}
      </div>
    </div>
  );
}

const crumbClassName =
  'truncate rounded-md px-1.5 py-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

/** the bar on top of a panel, going back to the overview from `root` */
function PanelNav({
  root,
  onRoot,
  onBack,
  end,
  children,
}: {
  root: ReactNode;
  onRoot: () => void;
  onBack: () => void;
  end?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations({ note: 'playground' });

  return (
    <nav
      aria-label={t('Breadcrumb')}
      className="flex h-10 shrink-0 items-center gap-1 border-b ps-1.5 pe-1.5 text-[0.8125rem]"
    >
      <button
        type="button"
        aria-label={t('Back')}
        onClick={onBack}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
          'me-1 text-fd-muted-foreground',
        )}
      >
        <ArrowLeft />
      </button>
      <ol className="flex min-w-0 items-center gap-0.5">
        <li className="flex min-w-0 shrink-0 items-center">
          <button type="button" onClick={onRoot} className={crumbClassName}>
            {root}
          </button>
        </li>
        {children}
      </ol>
      {end}
    </nav>
  );
}

function Crumb({ children }: { children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-0.5 last:shrink-0 motion-safe:transition-opacity motion-safe:starting:opacity-0">
      <ChevronRight className="size-3.5 shrink-0 text-fd-muted-foreground/60" />
      {children}
    </li>
  );
}

function Breadcrumbs({
  root,
  stack,
  onNavigate,
}: {
  root: ReactNode;
  stack: FieldEntry[];
  onNavigate: (stack: FieldEntry[], motion?: Motion) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const engine = useDataEngine();
  const current = stack[stack.length - 1];

  return (
    <PanelNav
      root={root}
      onRoot={() => onNavigate([])}
      onBack={() => onNavigate(stack.slice(0, -1))}
      end={
        current.removal && (
          <button
            type="button"
            onClick={() => {
              engine.delete(current.fieldName);
              onNavigate(stack.slice(0, -1));
            }}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'ms-auto shrink-0 text-fd-muted-foreground',
            )}
          >
            {current.removal === 'remove' ? t('Remove') : t('Unset')}
          </button>
        )
      }
    >
      {stack.map((entry, i) => {
        const { siblings } = entry;
        let node: ReactNode;
        if (i < stack.length - 1) {
          node = (
            <button
              type="button"
              onClick={() => onNavigate(stack.slice(0, i + 1))}
              className={cn(crumbClassName, 'font-mono')}
            >
              {entry.name}
            </button>
          );
        } else if (siblings && siblings.length > 1) {
          node = (
            <SiblingSelect
              entry={entry}
              siblings={siblings}
              onSelect={(sibling, motion) =>
                onNavigate([...stack.slice(0, -1), { ...sibling, siblings }], motion)
              }
            />
          );
        } else {
          node = (
            <span aria-current="page" className="truncate px-1.5 py-1 font-mono font-medium">
              {entry.name}
            </span>
          );
        }

        return <Crumb key={stringifyFieldKey(entry.fieldName)}>{node}</Crumb>;
      })}
    </PanelNav>
  );
}

/** the current field, switches to the other nested fields of its parent */
function SiblingSelect({
  entry,
  siblings,
  onSelect,
}: {
  entry: FieldEntry;
  siblings: FieldEntry[];
  onSelect: (sibling: FieldEntry, motion: Motion) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const current = stringifyFieldKey(entry.fieldName);
  const items = siblings.map((item) => ({
    value: stringifyFieldKey(item.fieldName),
    label: item.name,
  }));

  return (
    <Select
      items={items}
      value={current}
      onValueChange={(value) => {
        const next = items.findIndex((item) => item.value === value);
        if (next === -1 || value === current) return;
        const prev = items.findIndex((item) => item.value === current);
        onSelect(siblings[next], next > prev ? 'next' : 'previous');
      }}
    >
      <SelectTrigger
        aria-label={t('Switch Field')}
        className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-1.5 py-0 font-mono text-[0.8125rem] font-medium text-fd-foreground hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 data-popup-open:bg-fd-accent"
      >
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="font-mono text-[0.8125rem]">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Overview({
  auth,
  body,
  sectionNames,
  onNavigate,
  onAuthorize,
  renderParameterField,
  renderBodyField,
}: RenderOptions & {
  auth: PlaygroundAuth;
  body?: RequestBodyInfo;
  sectionNames: Record<string, string>;
  onNavigate: NavigateFn;
  onAuthorize: (target: AuthTarget) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const { parameters } = useOperation();

  if (auth.requirements.length === 0 && parameters.length === 0 && !body) {
    return (
      <p className="p-6 text-center text-sm text-fd-muted-foreground">
        {t('This endpoint has no parameters.')}
      </p>
    );
  }

  return (
    <>
      {auth.requirements.length > 0 && <AuthSection auth={auth} onAuthorize={onAuthorize} />}
      {parameters.map(({ in: type, items }) => {
        const entries = items.map((param): FieldEntry => ({
          fieldName: [type, param.name],
          name: param.name,
          schema: getParameterSchema(param),
          removal: getRemoval(param.required ?? false, false),
        }));

        return (
          <Section
            key={type}
            icon={sectionIcons[type]}
            title={sectionNames[type]}
            count={items.length}
          >
            {items.map((param, i) =>
              renderParameterField ? (
                <Fragment key={param.name}>
                  {renderParameterField(entries[i].fieldName, param)}
                </Fragment>
              ) : (
                <FieldRow
                  key={param.name}
                  entry={entries[i]}
                  required={param.required}
                  description={param.description}
                  onNavigate={() => onNavigate(entries[i], entries)}
                />
              ),
            )}
          </Section>
        );
      })}
      {body && (
        <BodySection body={body} renderBodyField={renderBodyField} onNavigate={onNavigate} />
      )}
    </>
  );
}

function getParameterSchema(param: ParameterObject): JsonSchema {
  if (param.content) {
    for (const type in param.content)
      return (param.content[type].schema ?? anyFields) as JsonSchema;
  }

  return (param.schema ?? anyFields) as JsonSchema;
}

function Section({
  icon: Icon,
  title,
  count,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: ReactNode;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b last:border-b-0">
      <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-fd-card ps-4 pe-2 @sm:pe-7.5">
        <Icon className="size-3.5 shrink-0 text-fd-primary" />
        <h3 className="text-[0.8125rem] font-medium">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-fd-muted-foreground tabular-nums">{count}</span>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

function AuthSection({
  auth,
  onAuthorize,
}: {
  auth: PlaygroundAuth;
  onAuthorize: (target: AuthTarget) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const { requirements, selected, select, fields } = auth;
  const items = requirements.map((requirement, i) => ({
    value: i,
    label: (
      <span className="inline-flex items-center gap-1 font-mono">
        {requirement.map((item, j) => (
          <Fragment key={item.id}>
            {j > 0 && <PlusIcon className="size-3 text-fd-muted-foreground" />}
            <span className={cn(item.scheme.deprecated && 'text-fd-muted-foreground line-through')}>
              {item.id}
            </span>
          </Fragment>
        ))}
      </span>
    ),
  }));

  return (
    <Section
      icon={KeyRound}
      title={t('Authorization')}
      actions={
        items.length > 1 ? (
          <Select items={items} value={selected} onValueChange={(v) => v !== null && select(v)}>
            <SelectTrigger className="h-7 w-auto max-w-60 gap-1.5 @sm:-me-2 border-0 bg-transparent px-2 text-xs hover:bg-fd-accent focus:ring-0 focus-visible:ring-2">
              <SelectValue className="truncate" />
            </SelectTrigger>
            <SelectContent align="end">
              {items.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="truncate text-xs text-fd-muted-foreground">{items[0]?.label}</span>
        )
      }
    >
      {fields.map((field) => {
        const Render = field.provider.render!;

        return (
          <AuthFieldContext key={stringifyFieldKey(field.fieldName)} value={{ field, onAuthorize }}>
            <Render field={field} Value={AuthValue} Panel={AuthPanelRow} />
          </AuthFieldContext>
        );
      })}
    </Section>
  );
}

const AuthFieldContext = createContext<{
  field: AuthField;
  onAuthorize: (target: AuthTarget) => void;
} | null>(null);

const stringSchema: Exclude<JsonSchema, boolean> = { type: 'string' };

function AuthValue({
  path,
  schema = stringSchema,
  ...props
}: ComponentProps<AuthRenderProps['Value']>) {
  const { field } = use(AuthFieldContext)!;

  return (
    <ValueRow
      {...props}
      fieldName={path ? [...field.fieldName, path] : field.fieldName}
      field={schema}
    />
  );
}

function AuthPanelRow({ title, component }: ComponentProps<AuthRenderProps['Panel']>) {
  const { field, onAuthorize } = use(AuthFieldContext)!;

  return (
    <LinkRow name={field.schemeId} onClick={() => onAuthorize({ field, component })}>
      {title}
    </LinkRow>
  );
}

function BodySection({
  body,
  renderBodyField,
  onNavigate,
}: Pick<RenderOptions, 'renderBodyField'> & {
  body: RequestBodyInfo;
  onNavigate: NavigateFn;
}) {
  const t = useTranslations({ note: 'playground' });
  const [mode, setMode] = useState('form');
  const root = useResolvedSchema(body.schema);
  const entry: FieldEntry = { fieldName: ['body'], name: 'body', schema: body.schema };
  const allowJson =
    !renderBodyField &&
    body.mediaType !== 'multipart/form-data' &&
    !(root.type === 'string' && root.format === 'binary');

  let content: ReactNode;
  if (renderBodyField) content = renderBodyField('body', body);
  else if (allowJson && mode === 'json') content = <JsonEditor fieldName={entry.fieldName} />;
  else content = <FieldRows entry={entry} onNavigate={onNavigate} />;

  return (
    <Section
      icon={Braces}
      title={t('Body')}
      actions={
        <>
          <code className="min-w-0 truncate text-xs text-fd-muted-foreground">
            {body.mediaType}
          </code>
          {allowJson && (
            <Segmented value={mode} onValueChange={setMode} className="@sm:-me-2.5">
              <SegmentedList
                aria-label={t('Editor')}
                items={[
                  { value: 'form', label: t('Form') },
                  { value: 'json', label: 'JSON' },
                ]}
              />
            </Segmented>
          )}
        </>
      }
    >
      {content}
    </Section>
  );
}

function JsonEditor({ fieldName }: { fieldName: FieldKey }) {
  const engine = useDataEngine();
  const [value] = useFieldValue(fieldName);
  const [draft, setDraft] = useState(() => ({ value, text: formatJson(value), error: '' }));
  if (draft.value !== value) setDraft({ value, text: formatJson(value), error: '' });

  return (
    <div className="flex flex-col">
      <textarea
        aria-label="JSON"
        value={draft.text}
        spellCheck={false}
        onChange={(e) => {
          const text = e.target.value;
          try {
            const parsed: unknown = JSON.parse(text);
            setDraft({ value: parsed, text, error: '' });
            engine.update(fieldName, parsed);
          } catch (err) {
            setDraft({ ...draft, text, error: err instanceof Error ? err.message : '' });
          }
        }}
        className="min-h-60 w-full resize-none bg-transparent px-4 py-3 font-mono text-[0.8125rem] leading-relaxed outline-none field-sizing-content"
      />
      {draft.error && (
        <p className="border-t px-4 py-2 font-mono text-xs text-red-400">{draft.error}</p>
      )}
    </div>
  );
}

function formatJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}
