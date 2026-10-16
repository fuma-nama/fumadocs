import type {
  AsyncAPIObject,
  ReferenceObject,
  SecuritySchemeObject,
  WsChannelBinding,
} from '@/types';
import { dereference, type JsonSchema } from '@fumadocs/json-schema';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import { idToTitle } from 'shared-api/utils/id-to-title';
import type { GeneratedPageProps } from './builder';
import { dereferenceBundledDocument } from '../document/dereference';
import { getServers, type OperationMessage, resolveOperation, toRequirements } from '../schema';
import { resolveServerUrl } from '../server-url';
import { generateTypeScriptDefinitions } from '../typescript';

/**
 * The operations of a page in Markdown, for LLMs.
 */
export function toMarkdown(page: GeneratedPageProps, document: AsyncAPIObject): string {
  const doc = dereferenceBundledDocument(document).dereferenced;
  // operations have their own headings when the page shows titles
  const heading = page.showTitle ? '###' : '##';
  const out: string[] = [];

  for (const item of page.operations ?? []) {
    const info = resolveOperation(doc, item.id);
    if (!info) continue;
    const { operation, channel } = info;
    const name = toTypeName(item.id);
    /** schemas of the operation, declared as TypeScript types at the end */
    const types: Record<string, JsonSchema> = {};
    const payloads: { $ref: string }[] = [];

    if (page.showTitle) {
      out.push(`## ${info.title}`);
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

    const servers = Object.entries(getServers(doc, channel));
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
    for (const { name: key, parameter } of info.parameters) {
      let notes = parameter.description ?? '';
      // sentences after a description without its own period run into it
      if (notes && !/[.!?]$/.test(notes)) notes += '.';
      if (parameter.enum) notes += ` One of ${inlineCode(parameter.enum)}.`;
      if (parameter.default) notes += ` Defaults to \`${parameter.default}\`.`;
      notes = notes.trimStart();
      lines.push(notes ? `- \`${key}\`: ${notes}` : `- \`${key}\``);
    }
    if (lines.length > 0) out.push(`${heading} Address Parameters`, lines.join('\n'));

    const ws = dereference(dereference(channel.bindings)?.ws) as WsChannelBinding | undefined;
    if (ws?.query) {
      types[`${name}Query`] = getRaw(dereference(ws.query)) as JsonSchema;
      out.push(`${heading} Query Parameters`, `The query of connection URL: \`${name}Query\``);
    }

    /** `reply`: the messages go the other way, they aren't in the union of operation */
    function messages(items: OperationMessage[], reply = false) {
      for (const item of items) {
        const { message, contentType } = item;
        const typeName = toTypeName(item.id);

        out.push(`${heading}# ${item.name}`);
        if (message.summary) out.push(message.summary);
        if (message.description) out.push(message.description);
        if (contentType) out.push(`Content type: \`${contentType}\``);
        for (const [label, schema] of [
          ['Payload', item.payload],
          ['Headers', item.headers],
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

        const example = item.examples[0];
        if (example?.payload !== undefined)
          out.push('Example payload:', codeBlock(example.payload));
      }
    }

    if (info.messages.length > 0) {
      out.push(`${heading} Messages`);
      messages(info.messages);
    }

    if (info.reply) {
      const { address, channel: replyChannel } = info.reply;

      out.push(`${heading} Reply`);
      if (address) out.push(`Sent to the address at \`${address.location}\` of the request.`);
      else if (replyChannel?.address) out.push(`Sent to \`${replyChannel.address}\`.`);
      messages(info.reply.messages, true);
    }

    // one block declares the shared types once: the payloads of operation are the root, the rest
    // are from `$defs`, and types of both ways keep the properties of both
    const code =
      Object.keys(types).length > 0 &&
      generateTypeScriptDefinitions(
        { $defs: types, anyOf: payloads.length > 0 ? payloads : undefined },
        { name: `${name}Message`, readOnly: true, writeOnly: true, document },
      );
    if (code) out.push(`${heading} Types`, `\`\`\`ts\n${code.trimEnd()}\n\`\`\``);
  }

  return out.join('\n\n');
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

function schemeList(schemes: (SecuritySchemeObject | ReferenceObject)[]): string {
  let out = '';
  for (const { id, scheme } of toRequirements(schemes)) {
    let type: string = scheme.type;
    if (scheme.type === 'httpApiKey') type += ` in ${scheme.in} \`${scheme.name}\``;
    else if (scheme.type === 'apiKey') type += ` in ${scheme.in}`;
    else if (scheme.type === 'http') type += ` ${scheme.scheme}`;
    out += `${out && '\n'}- \`${id}\` (${type})${scheme.description ? `: ${scheme.description}` : ''}`;
  }

  return out;
}

function codeBlock(value: unknown): string {
  if (typeof value === 'string') return `\`\`\`\n${value}\n\`\`\``;
  // references are kept, resolved schemas can be recursive
  return `\`\`\`json\n${JSON.stringify(getRaw(value), null, 2)}\n\`\`\``;
}
