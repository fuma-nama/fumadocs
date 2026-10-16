import type {
  AsyncAPIObject,
  ReferenceObject,
  SecuritySchemeObject,
  ServerObject,
  WsChannelBinding,
} from '@/types';
import { dereference, type JsonSchema } from '@fumadocs/json-schema';
import { generate } from '@fumari/json-schema-ts';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import { idToTitle } from 'shared-api/utils/id-to-title';
import type { GeneratedPageProps } from './builder';
import { dereferenceBundledDocument } from '../document/dereference';
import {
  getMessageDisplayName,
  getOperationDisplayName,
  getOperationMessages,
  resolveMultiFormatSchema,
} from '../schema';
import { applyMessageTraits, applyOperationTraits } from '../traits';
import { getExampleMessages } from '../get-example-messages';
import { resolveServerUrl } from '../server-url';

/**
 * The operations of a page in Markdown, for LLMs.
 */
export function toMarkdown(page: GeneratedPageProps, document: AsyncAPIObject): string {
  const doc = dereferenceBundledDocument(document).dereferenced;
  // operations have their own headings when the page shows titles
  const heading = page.showTitle ? '###' : '##';
  const out: string[] = [];

  for (const item of page.operations ?? []) {
    const found = dereference(doc.operations?.[item.id]);
    if (!found) continue;
    const operation = applyOperationTraits(found);
    const channel = dereference(operation.channel);
    const name = toTypeName(item.id);
    /** schemas of the operation, declared as TypeScript types at the end */
    const types: Record<string, JsonSchema> = {};
    const payloads: { $ref: string }[] = [];

    if (page.showTitle) {
      out.push(`## ${getOperationDisplayName(item.id, operation)}`);
      if (operation.description) out.push(operation.description);
    }
    if (channel.description && channel.description !== operation.description)
      out.push(channel.description);

    out.push(
      operation.action === 'send'
        ? `${doc.info.title} sends these messages to you.`
        : `You send these messages to ${doc.info.title}.`,
    );
    if (channel.address) out.push(`Address: \`${channel.address}\``);

    const servers = getServers(doc, channel.servers);
    let lines: string[] = [];
    for (const [id, server] of servers) {
      lines.push(
        `- \`${resolveServerUrl(server, {})}\` (${server.title ?? idToTitle(id)}, ${server.protocol})`,
      );
    }
    if (lines.length > 0) out.push(`${heading} Servers`, lines.join('\n'));

    const security: string[] = [];
    for (const [id, server] of servers) {
      if (!server.security || server.security.length === 0) continue;
      security.push(`Connecting to \`${id}\` takes one of:\n\n${schemeList(server.security)}`);
    }
    // traits often repeat the security of servers
    if (
      operation.security &&
      operation.security.length > 0 &&
      !(
        servers.length > 0 &&
        servers.every(([, server]) => isSameList(server.security, operation.security))
      )
    ) {
      security.push(`The operation takes one of:\n\n${schemeList(operation.security)}`);
    }
    if (security.length > 0) out.push(`${heading} Authorization`, ...security);

    lines = [];
    for (const [key, value] of Object.entries(channel.parameters ?? {})) {
      const parameter = dereference(value);
      let line = `- \`${key}\``;
      if (parameter.description) line += `: ${parameter.description}`;
      if (parameter.enum) line += ` One of ${inlineCode(parameter.enum)}.`;
      if (parameter.default) line += ` Defaults to \`${parameter.default}\`.`;
      lines.push(line);
    }
    if (lines.length > 0) out.push(`${heading} Address Parameters`, lines.join('\n'));

    const ws = dereference(dereference(channel.bindings)?.ws) as WsChannelBinding | undefined;
    if (ws?.query) {
      types[`${name}Query`] = getRaw(dereference(ws.query)) as JsonSchema;
      out.push(`${heading} Query Parameters`, `The query of connection URL: \`${name}Query\``);
    }

    /** `reply`: the messages go the other way, they aren't in the union of operation */
    function messages(entries: ReturnType<typeof getOperationMessages>, reply = false) {
      for (const { key, value } of entries) {
        const message = applyMessageTraits(dereference(value));
        const typeName = toTypeName(key);
        const payload = resolveMultiFormatSchema(message.payload);
        const headers = resolveMultiFormatSchema(message.headers);
        const contentType = message.contentType ?? doc.defaultContentType;
        // replies go the other way
        const received = (operation.action === 'send') !== reply;
        const example = getExampleMessages(message, { headers, payload, received })[0];

        out.push(`${heading}# ${getMessageDisplayName(key, message)}`);
        if (message.summary) out.push(message.summary);
        if (message.description) out.push(message.description);
        if (contentType) out.push(`Content type: \`${contentType}\``);
        for (const [label, schema] of [
          ['Payload', payload],
          ['Headers', headers],
        ] as const) {
          if (!schema) continue;
          if (schema.schemaFormat !== undefined) {
            out.push(`${label} (\`${schema.schemaFormat}\`):`, codeBlock(schema.schema));
          } else {
            types[typeName + label] = getRaw(schema.schema) as JsonSchema;
            if (label === 'Payload' && !reply)
              payloads.push({ $ref: `#/$defs/${typeName}${label}` });
            out.push(`${label}: \`${typeName}${label}\``);
          }
        }
        if (example?.payload !== undefined)
          out.push('Example payload:', codeBlock(example.payload));
      }
    }

    const entries = getOperationMessages(operation.messages, channel);
    if (entries.length > 0) {
      out.push(`${heading} Messages`);
      messages(entries);
    }

    if (operation.reply) {
      const reply = dereference(operation.reply);
      const address = dereference(reply.address);
      const replyChannel = dereference(reply.channel);

      out.push(`${heading} Reply`);
      if (address) out.push(`Sent to the address at \`${address.location}\` of the request.`);
      else if (replyChannel?.address) out.push(`Sent to \`${replyChannel.address}\`.`);
      messages(getOperationMessages(reply.messages, replyChannel), true);
    }

    const code = generateTypes(document, types, payloads, `${name}Message`);
    if (code) out.push(`${heading} Types`, `\`\`\`ts\n${code.trimEnd()}\n\`\`\``);
  }

  return out.join('\n\n');
}

/** one block for the types of an operation, so shared types are declared once */
function generateTypes(
  document: AsyncAPIObject,
  types: Record<string, JsonSchema>,
  payloads: { $ref: string }[],
  name: string,
): string | undefined {
  if (Object.keys(types).length === 0) return;

  try {
    // the payloads of operation are the root, other declarations are from `$defs`,
    // the types of both ways share declarations, they keep the properties of both
    return generate(
      { ...(document as object), $defs: types, anyOf: payloads.length > 0 ? payloads : undefined },
      { name, readOnly: true, writeOnly: true },
    );
  } catch (e) {
    console.warn('Failed to generate TypeScript definitions:', e);
  }
}

/** like `PlanetCreated` */
function toTypeName(id: string): string {
  return idToTitle(id).replace(/\W/g, '');
}

function inlineCode(values: string[]): string {
  let out = '';
  for (const value of values) out += out ? `, \`${value}\`` : `\`${value}\``;
  return out;
}

function isSameList(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (dereference(a[i]) !== dereference(b[i])) return false;
  return true;
}

function getServers(
  doc: AsyncAPIObject,
  refs: (ServerObject | ReferenceObject)[] | undefined,
): [id: string, server: ServerObject][] {
  // absent or empty: all servers, resolved values are referentially stable in the magic proxy
  let selected: Set<ServerObject> | undefined;
  if (refs && refs.length > 0) {
    selected = new Set();
    for (const ref of refs) selected.add(dereference(ref));
  }

  const out: [string, ServerObject][] = [];
  for (const [id, value] of Object.entries(doc.servers ?? {})) {
    const server = dereference(value);
    if (!selected || selected.has(server)) out.push([id, server]);
  }

  return out;
}

function schemeList(schemes: (SecuritySchemeObject | ReferenceObject)[]): string {
  const lines: string[] = [];
  for (const item of schemes) {
    const scheme = dereference(item);
    const id = '$ref' in item ? item.$ref.slice(item.$ref.lastIndexOf('/') + 1) : scheme.type;
    let type: string = scheme.type;
    if (scheme.type === 'httpApiKey') type += ` in ${scheme.in} \`${scheme.name}\``;
    else if (scheme.type === 'apiKey') type += ` in ${scheme.in}`;
    else if (scheme.type === 'http') type += ` ${scheme.scheme}`;
    lines.push(`- \`${id}\` (${type})${scheme.description ? `: ${scheme.description}` : ''}`);
  }

  return lines.join('\n');
}

function codeBlock(value: unknown): string {
  if (typeof value === 'string') return `\`\`\`\n${value}\n\`\`\``;
  // references are kept, resolved schemas can be recursive
  return `\`\`\`json\n${JSON.stringify(getRaw(value), null, 2)}\n\`\`\``;
}
