'use client';
import { type ComponentProps, Suspense, use } from 'react';
import type { Highlighter } from 'fumadocs-core/highlight';
import { toJsx } from 'fumadocs-core/utils/hast-to-jsx';
import { useRenderContext } from '@/utils/create-page';
import { cn } from '@/utils/cn';

const sharedClass =
  'px-4 py-3 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap wrap-break-word';

/**
 * A plain text editor with syntax highlighting, by overlaying a transparent
 * `<textarea>` on top of highlighted output.
 */
export function CodeEditor({
  value,
  onValueChange,
  lang,
  className,
  ...props
}: Omit<ComponentProps<'textarea'>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  lang: string;
}) {
  const { highlighter } = useRenderContext();
  const highlighted = <Highlighted highlighter={highlighter} lang={lang} value={value} />;

  return (
    <div
      className={cn(
        'relative ring-fd-ring ring-inset transition-shadow has-focus-visible:ring-1',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          sharedClass,
          'min-h-24 [&_span]:text-(--shiki-light) dark:[&_span]:text-(--shiki-dark)',
        )}
      >
        {highlighter.loadLanguage ? (
          <Suspense fallback={value}>{highlighted}</Suspense>
        ) : (
          highlighted
        )}
        {'\n'}
      </div>
      <textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Tab' || e.shiftKey) return;
          e.preventDefault();
          // `execCommand` keeps the undo stack
          if (!document.execCommand('insertText', false, '  ')) {
            const element = e.currentTarget;
            element.setRangeText('  ', element.selectionStart, element.selectionEnd, 'end');
            onValueChange(element.value);
          }
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className={cn(
          sharedClass,
          'absolute inset-0 size-full resize-none overflow-hidden bg-transparent text-transparent caret-fd-foreground outline-none selection:bg-fd-primary/20',
        )}
        {...props}
      />
    </div>
  );
}

const languages = new WeakMap<Highlighter, Map<string, Promise<void>>>();

function Highlighted({
  highlighter,
  lang,
  value,
}: {
  highlighter: Highlighter;
  lang: string;
  value: string;
}) {
  if (highlighter.loadLanguage) {
    let loading = languages.get(highlighter);
    if (!loading) languages.set(highlighter, (loading = new Map()));
    let promise = loading.get(lang);
    // once the language loads, keystrokes highlight synchronously
    if (!promise) loading.set(lang, (promise = highlighter.loadLanguage(lang)));
    use(promise);
  }

  return toJsx(highlighter.codeToHast(value, { lang, structure: 'inline' }));
}
