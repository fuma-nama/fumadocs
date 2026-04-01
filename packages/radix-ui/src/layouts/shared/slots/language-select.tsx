'use client';
import type { ComponentProps } from 'react';
import { useI18n } from '@/contexts/i18n';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';

export interface LanguageSelectProps extends ComponentProps<'button'> {
  variant?: VariantProps<typeof buttonVariants>['variant'];
}

export function LanguageSelect({
  className,
  variant = 'ghost',
  children,
  ...rest
}: LanguageSelectProps): React.ReactElement {
  const context = useI18n();
  if (!context.locales) throw new Error('Missing `<I18nProvider />`');

  return (
    <Popover>
      <PopoverTrigger
        aria-label={context.text.chooseLanguage}
        className={cn(
          buttonVariants({ variant }),
          'gap-1.5 p-1.5 data-[state=open]:bg-fd-accent',
          className,
        )}
        {...rest}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-0.5 p-1">
        <p className="p-2 text-xs font-medium text-fd-muted-foreground">
          {context.text.chooseLanguage}
        </p>
        {context.locales.map((item) => (
          <button
            key={item.locale}
            type="button"
            className={cn(
              'px-2 py-1.5 text-start text-sm rounded-lg transition-colors',
              item.locale === context.locale
                ? 'bg-fd-primary/10 text-fd-primary'
                : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
            )}
            onClick={() => {
              context.onChange?.(item.locale);
            }}
          >
            {item.name}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export type LanguageSelectTextProps = ComponentProps<'span'>;

export function LanguageSelectText(props: LanguageSelectTextProps) {
  const { locales, locale } = useI18n();
  const text = locales?.find((item) => item.locale === locale)?.name;

  return <span {...props}>{text}</span>;
}
