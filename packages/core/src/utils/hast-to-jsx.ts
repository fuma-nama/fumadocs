import type { Element, ElementContent, Nodes, Parents } from 'hast';
import type {
  Expression,
  ExpressionStatement,
  ObjectExpression,
  Program,
  SpreadElement,
} from 'estree-jsx';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute } from 'mdast-util-mdx';
import type { ComponentType, ElementType, JSX, ReactNode } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

export type Components = {
  [Tag in keyof JSX.IntrinsicElements]:
    | ComponentType<JSX.IntrinsicElements[Tag]>
    | keyof JSX.IntrinsicElements;
};

/** Turns the ESTree of MDX nodes into values. */
export interface Evaluator {
  evaluateExpression: (expression: Expression) => unknown;
  evaluateProgram: (program: Program) => unknown;
}

export interface ToJsxOptions {
  components?: Partial<Components>;
  /** Required by MDX expressions, ESM, and JSX elements with expressions or capitalized names. */
  evaluator?: Evaluator;
}

interface State extends ToJsxOptions {
  components: Partial<Components>;
  /** parsed `style` attributes of this call, code repeats a few */
  styles: Map<string, Record<string, string>>;
  /** `style` attributes of this call as React writes them */
  styleAttributes: Map<string, string>;
}

interface Schema {
  /** known names, lowercase or as React props, to React props */
  names: Map<string, string>;
  commaSeparated: string[];
}

// the names `property-information` 7 knows: React props, or attributes when they have `-` or `:`
// (`stroke-width`, `xlink:href`); capitalized ones are `on*` handlers, `aria` lists `aria*` properties
const aria =
  'ActiveDescendant Atomic AutoComplete Busy Checked ColCount ColIndex ColSpan Controls Current DescribedBy Details Disabled DropEffect ErrorMessage Expanded FlowTo Grabbed HasPopup Hidden Invalid KeyShortcuts Label LabelledBy Level Live Modal MultiLine MultiSelectable Orientation Owns Placeholder PosInSet Pressed ReadOnly Relevant Required RoleDescription RowCount RowIndex RowSpan Selected SetSize Sort ValueMax ValueMin ValueNow ValueText';
const common =
  'role className content crossOrigin download height href hrefLang id lang max media method min name Abort AfterPrint BeforePrint Cancel CanPlay CanPlayThrough Change Click Close Copy CueChange Cut DblClick Drag DragEnd DragEnter DragExit DragLeave DragOver DragStart Drop DurationChange Emptied Ended Error Focus HashChange Input Invalid KeyDown KeyPress KeyUp Load LoadedData LoadedMetadata LoadStart Message MouseDown MouseEnter MouseLeave MouseMove MouseOut MouseOver MouseUp Offline Online PageHide PageShow Paste Pause Play Playing PopState Progress RateChange Reset Resize Scroll Seeked Seeking Select Stalled Storage Submit Suspend TimeUpdate Toggle Unload VolumeChange Waiting ping referrerPolicy rel style tabIndex target title type width color event rev version property xlink:actuate xlink:arcrole xlink:href xlink:role xlink:show xlink:title xlink:type xmlns:xlink xmlns xml:base xml:lang xml:space';
const html: Schema = {
  names: createNames(
    'abbr accept accept-charset accessKey action allow allowFullScreen allowPaymentRequest allowUserMedia alpha alt as async autoCapitalize autoComplete autoFocus autoPlay blocking capture charSet checked cite closedBy colorSpace cols colSpan command commandFor contentEditable controls controlsList coords data dateTime decoding default defer dir dirName disabled draggable encType enterKeyHint fetchPriority form formAction formEncType formMethod formNoValidate formTarget headers hidden high htmlFor http-equiv imageSizes imageSrcSet inert inputMode integrity is isMap itemID itemProp itemRef itemScope itemType kind label language list loading loop low manifest maxLength minLength multiple muted nonce noModule noValidate AuxClick BeforeMatch BeforeToggle BeforeUnload Blur ContextLost ContextMenu ContextRestored FormData LanguageChange LoadEnd MessageError RejectionHandled ScrollEnd SecurityPolicyViolation SlotChange UnhandledRejection Wheel open optimum pattern placeholder playsInline popover popoverTarget popoverTargetAction poster preload readOnly required reversed rows rowSpan sandbox scope scoped seamless selected shadowRootClonable shadowRootCustomElementRegistry shadowRootDelegatesFocus shadowRootMode shadowRootSerializable shape size sizes slot span spellCheck src srcDoc srcLang srcSet start step translate typeMustMatch useMap value wrap writingSuggestions align aLink archive axis background bgColor border borderColor bottomMargin cellPadding cellSpacing char charOff classID clear code codeBase codeType compact declare face frame frameBorder hSpace leftMargin link longDesc lowSrc marginHeight marginWidth noResize noHref noShade noWrap object profile prompt rightMargin rules scheme scrolling standby summary text topMargin valueType vAlign vLink vSpace allowTransparency autoCorrect autoSave credentialless disablePictureInPicture disableRemotePlayback exportParts part prefix results security unselectable',
  ).set('for', 'htmlFor'),
  commaSeparated: ['accept', 'coords', 'exportParts'],
};
const svg: Schema = {
  names: createNames(
    'about accent-height accumulate additive alignment-baseline alphabetic amplitude arabic-form ascent attributeName attributeType azimuth bandwidth baseline-shift baseFrequency baseProfile bbox begin bias by calcMode cap-height clip clip-path clipPathUnits clip-rule color-interpolation color-interpolation-filters color-profile color-rendering contentScriptType contentStyleType cursor cx cy d datatype defaultAction descent diffuseConstant direction display dur divisor dominant-baseline dx dy edgeMode editable elevation enable-background end exponent externalResourcesRequired fill fill-opacity fill-rule filter filterRes filterUnits flood-color flood-opacity focusable focusHighlight font-family font-size font-size-adjust font-stretch font-style font-variant font-weight format fr from fx fy g1 g2 glyph-name glyph-orientation-horizontal glyph-orientation-vertical glyphRef gradientTransform gradientUnits handler hanging hatchContentUnits hatchUnits horiz-adv-x horiz-origin-x horiz-origin-y ideographic image-rendering initialVisibility in in2 intercept k k1 k2 k3 k4 kernelMatrix kernelUnitLength keyPoints keySplines keyTimes kerning lengthAdjust letter-spacing lighting-color limitingConeAngle local marker-end marker-mid marker-start markerHeight markerUnits markerWidth mask maskContentUnits mask-type maskUnits mathematical mediaCharacterEncoding mediaContentEncodings mediaSize mediaTime mode nav-down nav-down-left nav-down-right nav-left nav-next nav-prev nav-right nav-up nav-up-left nav-up-right numOctaves observer offset Activate Begin End FocusIn FocusOut MouseWheel Repeat Show Zoom opacity operator order orient orientation origin overflow overlay overline-position overline-thickness paint-order panose-1 path pathLength patternContentUnits patternTransform patternUnits phase pitch playbackOrder pointer-events points pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits propagate r radius refX refY rendering-intent repeatCount repeatDur requiredExtensions requiredFeatures requiredFonts requiredFormats resource restart result rotate rx ry scale seed shape-rendering side slope snapshotTime specularConstant specularExponent spreadMethod spacing startOffset stdDeviation stemh stemv stitchTiles stop-color stop-opacity strikethrough-position strikethrough-thickness string stroke stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width surfaceScale syncBehavior syncBehaviorDefault syncMaster syncTolerance syncToleranceDefault systemLanguage tableValues targetX targetY text-anchor text-decoration text-rendering textLength timelineBegin transformBehavior typeof to transform transform-origin u1 u2 underline-position underline-thickness unicode unicode-bidi unicode-range units-per-em values v-alphabetic v-mathematical vector-effect v-hanging v-ideographic vert-adv-y vert-origin-x vert-origin-y viewBox viewTarget visibility widths word-spacing writing-mode x x1 x2 xChannelSelector x-height y y1 y2 yChannelSelector z zoomAndPan',
  ),
  commaSeparated: ['g1', 'g2', 'glyphName'],
};
const tableElements = new Set(['table', 'tbody', 'thead', 'tfoot', 'tr']);
// `escapeTextForBrowser()` of React
const escapable = /["&'<>]/g;
const escapes: Record<string, string> = {
  '"': '&quot;',
  '&': '&amp;',
  "'": '&#x27;',
  '<': '&lt;',
  '>': '&gt;',
};
// `estree-util-is-identifier-name`
const identifier = /^[$_\p{ID_Start}][$_\p{Join_Control}\p{ID_Continue}]*$/u;
const styleError = 'Cannot parse `style` attribute';
const mdxError = 'Cannot handle MDX estrees without `evaluator`';
const PROPERTY = 1;
const CUSTOM = 2;
const BRACKET = 4;
const VALUE = 8;
// ASCII character classes of `inline-style-parser` and `style-to-js`
const chars = Uint8Array.from({ length: 128 }, (_, code) => {
  const char = String.fromCharCode(code);
  return (
    (/[-#/*\\\w]/.test(char) ? PROPERTY : 0) |
    (/[-\w]/.test(char) ? CUSTOM : 0) |
    (/[0-9a-z_-]/.test(char) ? BRACKET : 0) |
    // where a value ends, or a string or parentheses start
    (/[;}"'(]/.test(char) ? VALUE : 0)
  );
});

/**
 * Convert hast, with MDX nodes, into React elements like `toJsxRuntime()` from `hast-util-to-jsx-runtime`, but faster.
 */
export function toJsx(tree: Nodes, { components = {}, evaluator }: ToJsxOptions = {}): ReactNode {
  const state: State = { components, evaluator, styles: new Map(), styleAttributes: new Map() };
  const result = one(tree, state, html, undefined);
  if (result && typeof result !== 'string') return result;
  return jsx(Fragment, { children: result || undefined });
}

function one(node: Nodes, state: State, schema: Schema, key: string | undefined): ReactNode {
  if (node.type === 'element') return element(node, state, schema, key);
  if (node.type === 'text') return node.value;
  if (node.type === 'root') return create(Fragment, {}, children(node, state, schema), key);
  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    // attributes are passed as they are
    return create(
      node.name === null ? Fragment : (jsxType(node.name, state) as ElementType),
      jsxProps(node.attributes, state.evaluator),
      children(node, state, schema === html && node.name === 'svg' ? svg : schema),
      key,
    );
  }
  if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression')
    return evaluate(node.data?.estree, state.evaluator) as ReactNode;
  if (node.type === 'mdxjsEsm') {
    if (!node.data?.estree || !state.evaluator) throw new Error(mdxError);
    return state.evaluator.evaluateProgram(node.data.estree) as ReactNode;
  }
}

function element(
  node: Element,
  state: State,
  parentSchema: Schema,
  key: string | undefined,
): ReactNode {
  const schema = parentSchema === html && node.tagName.toLowerCase() === 'svg' ? svg : parentSchema;
  const props: Record<string, unknown> = {};
  let align: string | undefined;

  for (const name in node.properties) {
    let value: unknown = node.properties[name];
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    if (name === 'children' || !Object.hasOwn(node.properties, name)) continue;

    const prop = propertyName(schema, name);
    if (Array.isArray(value)) {
      value = schema.commaSeparated.includes(prop)
        ? // a trailing empty item stays visible, like `comma-separated-tokens`
          (value.join(', ') + (value.at(-1) === '' ? ', ' : '')).trim()
        : value.join(' ').trim();
    }

    if (prop === 'style' && typeof value === 'object') {
      props.style = value;
    } else if (prop === 'style') {
      const input = String(value);
      let style = state.styles.get(input);
      if (!style) state.styles.set(input, (style = parseStyle(input)));
      props.style = style;
    } else if (
      prop === 'align' &&
      typeof value === 'string' &&
      (node.tagName === 'td' || node.tagName === 'th')
    ) {
      align = value;
    } else {
      props[prop] = value;
    }
  }

  if (align) props.style = { ...(props.style as object), textAlign: align };

  const type = Object.hasOwn(state.components, node.tagName)
    ? state.components[node.tagName as keyof Components]
    : node.tagName;
  const first = node.children[0];
  // React's work per element dominates highlighted code, its spans render as one HTML string
  if (
    typeof type === 'string' &&
    first?.type === 'element' &&
    first.tagName === 'span' &&
    !state.components.span &&
    !tableElements.has(node.tagName)
  ) {
    const html = toHtml(node.children, state);
    if (html !== undefined) {
      props.dangerouslySetInnerHTML = { __html: html };
      return create(type as ElementType, props, [], key);
    }
  }
  return create(type as ElementType, props, children(node, state, schema), key);
}

/** spans with class, style and `data-*` attributes, and text, as the HTML React renders; `undefined` for other content */
function toHtml(nodes: ElementContent[], state: State): string | undefined {
  let html = '';
  for (const node of nodes) {
    if (node.type === 'text') {
      html += escape(node.value);
      continue;
    }
    if (node.type !== 'element' || node.tagName !== 'span') return;

    html += '<span';
    for (const name in node.properties) {
      const value = node.properties[name];
      if (value === null || value === undefined || Number.isNaN(value) || name === 'children')
        continue;
      if (name === 'style' && typeof value === 'string') {
        html += styleAttribute(value, state);
        continue;
      }
      const attribute = name === 'className' ? 'class' : name;
      if (attribute !== 'class' && !attribute.startsWith('data-')) return;
      if (typeof value !== 'string' && typeof value !== 'number' && !Array.isArray(value)) return;
      html += ` ${attribute}="${escape(Array.isArray(value) ? value.join(' ').trim() : String(value))}"`;
    }

    const children = toHtml(node.children, state);
    if (children === undefined) return;
    html += `>${children}</span>`;
  }
  return html;
}

/** the `style` attribute React writes for the parsed `input` */
function styleAttribute(input: string, { styleAttributes }: State): string {
  let attribute = styleAttributes.get(input);
  if (attribute !== undefined) return attribute;

  attribute = '';
  for (const [name, value] of Object.entries(parseStyle(input))) {
    const property = name.startsWith('--')
      ? name
      : name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`).replace(/^ms-/, '-ms-');
    attribute += `${attribute ? ';' : ' style="'}${escape(property)}:${escape(value)}`;
  }
  if (attribute) attribute += '"';
  styleAttributes.set(input, attribute);
  return attribute;
}

function escape(value: string): string {
  return value.replace(escapable, (char) => escapes[char]);
}

function children(node: Parents, state: State, schema: Schema): ReactNode[] {
  const out: ReactNode[] = [];
  const table = node.type === 'element' && tableElements.has(node.tagName);
  let counts: Map<string, number> | undefined;

  for (const child of node.children) {
    let result: ReactNode;
    if (child.type === 'text') {
      result = child.value;
    } else {
      let key: string | undefined;
      const name =
        child.type === 'element'
          ? child.tagName
          : child.type === 'mdxJsxFlowElement' || child.type === 'mdxJsxTextElement'
            ? child.name
            : undefined;
      if (name) {
        counts ??= new Map();
        const count = counts.get(name) ?? 0;
        key = `${name}-${count}`;
        counts.set(name, count + 1);
      }

      result = one(child, state, schema, key);
      if (result === undefined) continue;
    }
    // React warns about white space in tables
    if (table && typeof result === 'string' && isWhitespace(result)) continue;
    out.push(result);
  }

  return out;
}

function create(
  type: ElementType,
  props: Record<string, unknown>,
  list: ReactNode[],
  key: string | undefined,
): ReactNode {
  if (list.length > 1) props.children = list;
  else if (list[0]) props.children = list[0];

  // static children use `jsxs()`, also from expressions and JSX attributes
  const fn = list.length > 1 || Array.isArray(props.children) ? jsxs : jsx;
  return key ? fn(type, props, key) : fn(type, props);
}

/** capitalized and member names are evaluated, like `findComponentFromName()` of `hast-util-to-jsx-runtime` */
function jsxType(name: string, { components, evaluator }: State): unknown {
  let expression: Expression | undefined;
  if (name.includes('.')) {
    for (const part of name.split('.')) {
      const property: Expression = identifier.test(part)
        ? { type: 'Identifier', name: part }
        : { type: 'Literal', value: part };
      const computed = property.type === 'Literal';
      expression = expression
        ? { type: 'MemberExpression', object: expression, property, computed, optional: false }
        : property;
    }
  } else if (identifier.test(name) && !/^[a-z]/.test(name)) {
    expression = { type: 'Identifier', name };
  }

  if (!expression)
    return Object.hasOwn(components, name) ? components[name as keyof Components] : name;
  if (!evaluator) throw new Error(mdxError);
  return evaluator.evaluateExpression(expression);
}

function jsxProps(
  attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[],
  evaluator?: Evaluator,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attribute of attributes) {
    if (attribute.type === 'mdxJsxExpressionAttribute') {
      Object.assign(props, evaluate(attribute.data?.estree, evaluator, true));
    } else if (attribute.value && typeof attribute.value === 'object') {
      props[attribute.name] = evaluate(attribute.value.data?.estree, evaluator);
    } else {
      props[attribute.name] = attribute.value === null ? true : attribute.value;
    }
  }
  return props;
}

/** evaluate the expression of an MDX estree, or the argument of `{...spread}` */
function evaluate(estree?: Program | null, evaluator?: Evaluator, spread = false): unknown {
  if (!estree || !evaluator) throw new Error(mdxError);
  let { expression: value } = estree.body[0] as ExpressionStatement;
  if (spread) value = ((value as ObjectExpression).properties[0] as SpreadElement).argument;
  return evaluator.evaluateExpression(value);
}

function createNames(list: string): Map<string, string> {
  const names = new Map([['class', 'className']]);
  for (const name of aria.split(' ')) {
    const prop = `aria-${name.toLowerCase()}`;
    names.set(prop, prop).set(`aria${name}`, prop).set(`aria${name.toLowerCase()}`, prop);
  }

  for (let name of `${common} ${list}`.split(' ')) {
    if (name.charCodeAt(0) < 97) name = `on${name}`;
    const prop = name.replace(/[-:](.)/g, (_, char: string) => char.toUpperCase());
    names.set(name, prop).set(prop, prop).set(prop.toLowerCase(), prop);
  }
  return names;
}

/** the React prop of a hast property name, like `find()` of `property-information` */
function propertyName({ names }: Schema, name: string): string {
  if (name.startsWith('data-')) return name;
  return names.get(name) ?? names.get(name.toLowerCase()) ?? dataName(name);
}

/** unknown `dataFooBar` names become `data-foo-bar` */
function dataName(name: string): string {
  if (name.charCodeAt(4) === 45 || /-[a-z]/.test(name)) return name;
  if (!/^data[-\w.:]+$/i.test(name)) return name;

  const rest = name.slice(4).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
  return rest.charCodeAt(0) === 45 ? `data${rest}` : `data-${rest}`;
}

/** inter-element white space, like `hast-util-whitespace` */
function isWhitespace(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code !== 32 && code !== 9 && code !== 10 && code !== 12 && code !== 13) return false;
  }
  return true;
}

/**
 * Parse a `style` attribute like `style-to-js` with `reactCompat`, reading declarations the way `inline-style-parser` does.
 */
function parseStyle(input: string): Record<string, string> {
  const style: Record<string, string> = {};
  let i = comments(input, skipSpace(input, 0));

  for (;;) {
    const start = i;
    // a name of `[-\w]` only has no comments, and is a custom property when it starts with `--`
    let plain = true;
    let code = input.charCodeAt(i);
    while (is(code, PROPERTY)) {
      if (!is(code, CUSTOM)) plain = false;
      code = input.charCodeAt(++i);
    }
    if (i === start) break;

    if (code === 91) {
      let end = i + 1;
      while (is(input.charCodeAt(end), BRACKET)) end++;
      if (end > i + 1 && input.charCodeAt(end) === 93) {
        i = end + 1;
        plain = false;
      }
    }
    const name = plain ? input.slice(start, i) : removeComments(input.slice(start, i));
    // a single comment may follow the name
    i = comment(input, skipSpace(input, i));
    if (input.charCodeAt(i) !== 58) throw new Error(styleError);

    const valueStart = skipSpace(input, i + 1);
    i = valueEnd(input, valueStart);
    const value = removeComments(input.slice(valueStart, i)).trim();
    if (value) style[plain && name.startsWith('--') ? name : camelCase(name)] = value;

    while (input.charCodeAt(i) === 59 || isSpace(input.charCodeAt(i))) i++;
    i = comments(input, i);
  }

  return style;
}

/** where a value ends: at `;` or `}` outside of strings and parentheses */
function valueEnd(input: string, i: number): number {
  while (i < input.length) {
    const code = input.charCodeAt(i);
    if (!is(code, VALUE)) {
      i++;
    } else if (code === 59 || code === 125) {
      break;
    } else if (code === 40) {
      const end = input.indexOf(')', i + 1);
      i = end === -1 ? i + 1 : end + 1;
    } else {
      i = quoteEnd(input, i, code);
    }
  }
  return i;
}

/** a string ends at its closing quote on the same line, or else after its last escaped quote */
function quoteEnd(input: string, start: number, quote: number): number {
  let end = start + 1;
  for (let i = start + 1; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code === quote) return i + 1;
    if (code === 92 && input.charCodeAt(i + 1) === quote) end = ++i + 1;
    else if (code === 10 || code === 13 || code === 0x2028 || code === 0x2029) break;
  }
  return end;
}

function comments(input: string, i: number): number {
  for (let next = comment(input, i); next !== i; next = comment(input, i)) i = next;
  return i;
}

function comment(input: string, i: number): number {
  if (input.charCodeAt(i) !== 47 || input.charCodeAt(i + 1) !== 42) return i;

  const end = input.indexOf('*/', i + 2);
  if (end === -1) throw new Error(styleError);
  return skipSpace(input, end + 2);
}

function removeComments(value: string): string {
  let out = '';
  let last = 0;
  for (let start = value.indexOf('/*'); start !== -1; start = value.indexOf('/*', last)) {
    const end = value.indexOf('*/', start + 2);
    if (end === -1) break;
    out += value.slice(last, start);
    last = end + 2;
  }
  return last === 0 ? value : out + value.slice(last);
}

function camelCase(name: string): string {
  if (!name.includes('-') || isCustomProperty(name)) return name;

  let lower = name.toLowerCase();
  // `-ms-` stays lowercase for React
  if (lower.startsWith('-ms-')) lower = lower.slice(1);
  let out = '';
  let last = 0;
  for (let i = lower.indexOf('-'); i !== -1; i = lower.indexOf('-', i + 1)) {
    const code = lower.charCodeAt(i + 1);
    if (code >= 97 && code <= 122) {
      out += lower.slice(last, i) + String.fromCharCode(code - 32);
      last = i + 2;
      i++;
    }
  }
  return out + lower.slice(last);
}

function isCustomProperty(name: string): boolean {
  if (name.length < 3 || !name.startsWith('--')) return false;
  for (let i = 2; i < name.length; i++) {
    if (!is(name.charCodeAt(i), CUSTOM)) return false;
  }
  return true;
}

function skipSpace(input: string, i: number): number {
  while (isSpace(input.charCodeAt(i))) i++;
  return i;
}

/** `\s` of regular expressions */
function isSpace(code: number): boolean {
  return (
    code === 32 ||
    (code >= 9 && code <= 13) ||
    (code > 127 && String.fromCharCode(code).trim() === '')
  );
}

function is(code: number, flag: number): boolean {
  return code < 128 && (chars[code] & flag) !== 0;
}
