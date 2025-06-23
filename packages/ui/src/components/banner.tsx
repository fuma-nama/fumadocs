'use client';

import { type HTMLAttributes, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';

type BannerVariant = 'rainbow' | 'normal';

export function Banner({
  id,
  variant = 'normal',
  changeLayout = true,
  height = '3rem',
  rainbowColors = [
    'rgba(0,149,255,0.56)',
    'rgba(231,77,255,0.77)',
    'rgba(255,0,0,0.73)',
    'rgba(131,255,166,0.66)',
  ],
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /**
   * @defaultValue 3rem
   */
  height?: string;

  /**
   * @defaultValue 'normal'
   */
  variant?: BannerVariant;

  /**
   * For rainbow variant only, customise the colors
   */
  rainbowColors?: string[];

  /**
   * Change Fumadocs layout styles
   *
   * @defaultValue true
   */
  changeLayout?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const globalKey = id ? `nd-banner-${id}` : null;

  useEffect(() => {
    if (globalKey) setOpen(localStorage.getItem(globalKey) !== 'true');
  }, [globalKey]);

  if (!open) return null;

  return (
    <div
      id={id}
      {...props}
      className={cn(
        'sticky top-0 z-40 flex flex-row items-center justify-center px-4 text-center text-sm font-medium',
        variant === 'normal' && 'bg-fd-secondary',
        variant === 'rainbow' && 'bg-fd-background',
        !open && 'hidden',
        props.className,
      )}
      style={{
        height,
      }}
    >
      {changeLayout && open ? (
        <style>
          {globalKey
            ? `:root:not(.${globalKey}) { --fd-banner-height: ${height}; }`
            : `:root { --fd-banner-height: ${height}; }`}
        </style>
      ) : null}
      {globalKey ? (
        <style>{`.${globalKey} #${id} { display: none; }`}</style>
      ) : null}
      {globalKey ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `if (localStorage.getItem('${globalKey}') === 'true') document.documentElement.classList.add('${globalKey}');`,
          }}
        />
      ) : null}

      {variant === 'rainbow'
        ? flow({
            colors: rainbowColors,
          })
        : null}
      {props.children}
      {id ? (
        <button
          type="button"
          aria-label="Close Banner"
          onClick={() => {
            setOpen(false);
            if (globalKey) localStorage.setItem(globalKey, 'true');
          }}
          className={cn(
            buttonVariants({
              color: 'ghost',
              className:
                'absolute end-2 top-1/2 -translate-y-1/2 text-fd-muted-foreground/50',
              size: 'icon-sm',
            }),
          )}
        >
          <X />
        </button>
      ) : null}
    </div>
  );
}

const maskImage =
  'linear-gradient(to bottom,white,transparent), radial-gradient(circle at top center, white, transparent)';

function flow({ colors }: { colors: string[] }) {
  return (
    <>
      <div
        className="absolute inset-0 z-[-1]"
        style={
          {
            maskImage,
            maskComposite: 'intersect',
            animation: 'fd-moving-banner 20s linear infinite',
            backgroundImage: `repeating-linear-gradient(70deg, ${[...colors, colors[0]].map((color, i) => `${color} ${(i * 50) / colors.length}%`).join(', ')})`,
            backgroundSize: '200% 100%',
            filter: 'saturate(2)',
          } as object
        }
      />
      <style>
        {`@keyframes fd-moving-banner {
            from { background-position: 0% 0;  }
            to { background-position: 100% 0;  }
         }`}
      </style>
    </>
  );
}
