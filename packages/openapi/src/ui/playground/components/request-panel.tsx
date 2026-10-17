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
  Braces,
  Cookie,
  KeyRound,
  type LucideIcon,
  PlusIcon,
  Route,
  Rows3,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import type { FieldKey } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import type { JsonSchema } from '@fumadocs/json-schema';
import { useTranslations } from '@fuma-translate/react';
import { anyFields, useResolvedSchema } from 'shared-api/components/playground/schema';
import {
  type FieldEntry,
  FieldRow,
  FieldRows,
  getRemoval,
  LinkRow,
  type NavigateFn,
  ValueRow,
} from 'shared-api/components/playground/fields';
import {
  Crumb,
  FieldPanel,
  OverviewLayer,
  Panel,
  PanelNav,
  Section,
  useFieldStack,
} from 'shared-api/components/playground/panels';
import { JsonEditor } from 'shared-api/components/playground/json-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { Segmented, SegmentedList } from 'shared-api/components/segmented';
import {
  type AuthField,
  type AuthPanelProps,
  type AuthProvider,
  type AuthRenderProps,
} from '@/playground/auth';
import type { Playground, PlaygroundAuth, RequestBodyInfo } from '@/playground/use-playground';
import { type OperationParameters, useOperation } from '@/operation';
import type { ParameterObject } from '@/types';
import { Markdown } from '@/ui/components/markdown';
import { cn } from '@/utils/cn';

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
  const fields = useFieldStack();
  const [authorizing, setAuthorizing] = useState<AuthTarget | null>(null);
  const sectionNames: Record<string, string> = {
    path: t('Path'),
    query: t('Query'),
    header: t('Header'),
    cookie: t('Cookies'),
    body: t('Body'),
  };

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
  } else if (fields.stack.length > 0) {
    panel = <FieldPanel fields={fields} root={sectionNames[fields.stack[0].fieldName[0]]} />;
  }

  // auth panels are outside the request form
  return (
    <div className={cn('@container grid min-h-0', className)}>
      <form noValidate className="contents" onSubmit={onSubmit}>
        <OverviewLayer covered={panel !== null}>
          <Overview
            {...options}
            auth={auth}
            body={body}
            sectionNames={sectionNames}
            onNavigate={fields.openNested([])}
            onAuthorize={setAuthorizing}
          />
        </OverviewLayer>
        {!authorizing && panel}
      </form>
      {authorizing && panel}
    </div>
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

/** mutual TLS schemes, they have no value */
export const mutualTLSProvider: AuthProvider = {
  on: ({ scheme }) => scheme.type === 'mutualTLS',
  render: function MutualTLSNote({ field }) {
    const t = useTranslations({ note: 'playground' });

    return (
      <div className="flex gap-2 border-b px-4 py-2.5 text-xs text-fd-muted-foreground last:border-b-0">
        <ShieldCheck className="mt-px size-3.5 shrink-0" />
        <div className="min-w-0 flex-1 [&_a]:underline">
          <p>{t('Requires a client certificate installed in your browser.')}</p>
          {field.scheme.description && <Markdown md={field.scheme.description} />}
        </div>
      </div>
    );
  },
};

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
