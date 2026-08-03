'use client';
import { type ComponentProps, type ReactNode, useEffect, useMemo, useState } from 'react';
import type { HighlighterCore } from 'shiki';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import { highlightHast } from 'fumadocs-core/highlight/shiki';
import { cn } from '@/utils/cn';
import { useRenderContext } from '../contexts/api';

const sharedClass =
  'font-mono text-[0.8125rem] leading-5.5 whitespace-pre-wrap break-words wrap-break-word';

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
  const { shiki, shikiOptions } = useRenderContext();
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const instance = await shiki.getOrInit();
      // pre-load the language & themes, so highlighting can be done synchronously on keystrokes
      await highlightHast(instance, '', { ...shikiOptions, lang });
      if (!cancelled) setHighlighter(instance);
    })();

    return () => {
      cancelled = true;
    };
  }, [shiki, shikiOptions, lang]);

  const highlighted: ReactNode = useMemo(() => {
    if (!highlighter) return value;

    try {
      return toJsxRuntime(
        highlighter.codeToHast(value, {
          ...shikiOptions,
          lang,
          defaultColor: false,
          structure: 'inline',
        }),
        JsxRuntime,
      );
    } catch {
      return value;
    }
  }, [highlighter, value, shikiOptions, lang]);

  return (
    <div className={cn('relative', sharedClass, className)}>
      <div
        aria-hidden
        className="min-h-20 px-3 py-2.5 [&_span]:text-(--shiki-light) dark:[&_span]:text-(--shiki-dark)"
      >
        {highlighted}
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
          'absolute inset-0 size-full resize-none overflow-hidden bg-transparent px-3 py-2.5 text-transparent caret-fd-foreground selection:bg-fd-primary/20 focus:outline-none',
        )}
        {...props}
      />
    </div>
  );
}
