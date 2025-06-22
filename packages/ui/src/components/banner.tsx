'use client';

import { type HTMLAttributes, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { hexToRGBA } from '@/theme/typography/styles';

type BannerVariant = 'rainbow' | 'normal' | `#${string}`;

function generateHexLayers(hexColor: string) {
  const firstLayer = {
    maskImage,
    maskComposite: 'intersect',
    animation: 'fd-moving-banner 16s linear infinite',
    '--start': hexToRGBA(hexColor, 0.5),
    '--mid': hexToRGBA(hexColor, 0.77),
    '--end': hexToRGBA(hexColor, 0.4),
    '--via': hexToRGBA(hexColor, 0.4),
    animationDirection: 'reverse',
    backgroundImage:
      'repeating-linear-gradient(60deg, var(--end), var(--start) 2%, var(--start) 5%, transparent 8%, transparent 14%, var(--via) 18%, var(--via) 22%, var(--mid) 28%, var(--mid) 30%, var(--via) 34%, var(--via) 36%, transparent, var(--end) calc(50% - 12px))',
    backgroundSize: '200% 100%',
    mixBlendMode: 'difference',
  } as const;

  const secondLayer = {
    maskImage,
    maskComposite: 'intersect',
    animation: 'fd-moving-banner 20s linear infinite',
    '--start': hexToRGBA(hexColor, 0.5),
    '--mid': hexToRGBA(hexColor, 0.4),
    '--end': hexToRGBA(hexColor, 0.51),
    '--via': hexToRGBA(hexColor, 0.56),
    backgroundImage:
      'repeating-linear-gradient(45deg, var(--end), var(--start) 4%, var(--start) 8%, transparent 9%, transparent 14%, var(--mid) 16%, var(--mid) 20%, transparent, var(--via) 36%, var(--via) 40%, transparent 42%, var(--end) 46%, var(--end) calc(50% - 16.8px))',
    backgroundSize: '200% 100%',
    mixBlendMode: 'color-dodge',
  } as const;

  return (
    <>
      <div className="absolute inset-0 z-[-1]" style={firstLayer} />
      <div className="absolute inset-0 z-[-1]" style={secondLayer} />
      <style>
        {`@keyframes fd-moving-banner {
          from { background-position: 0% 0;  }
          to { background-position: 100% 0;  }
        }`}
      </style>
    </>
  );
}

export function Banner({
  id,
  variant = 'normal',
  changeLayout = true,
  height = '3rem',
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

  const isHexColor = typeof variant === 'string' && variant.startsWith('#');

  return (
    <div
      id={id}
      {...props}
      className={cn(
        'sticky top-0 z-40 flex flex-row items-center justify-center px-4 text-center text-sm font-medium',
        variant === 'normal' && 'bg-fd-secondary',
        (variant === 'rainbow' || isHexColor) && 'bg-fd-background',
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

      {variant === 'rainbow' ? rainbowLayer : null}
      {isHexColor ? generateHexLayers(variant) : null}
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
                'absolute end-2 top-1/2 -translate-y-1/2 text-fd-muted-foreground',
              size: 'icon',
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

const rainbowLayer = (
  <>
    <div
      className="absolute inset-0 z-[-1]"
      style={
        {
          maskImage,
          maskComposite: 'intersect',
          animation: 'fd-moving-banner 16s linear infinite',
          '--start': 'rgba(0,87,255,0.5)',
          '--mid': 'rgba(255,0,166,0.77)',
          '--end': 'rgba(255,77,0,0.4)',
          '--via': 'rgba(164,255,68,0.4)',
          animationDirection: 'reverse',
          backgroundImage:
            'repeating-linear-gradient(60deg, var(--end), var(--start) 2%, var(--start) 5%, transparent 8%, transparent 14%, var(--via) 18%, var(--via) 22%, var(--mid) 28%, var(--mid) 30%, var(--via) 34%, var(--via) 36%, transparent, var(--end) calc(50% - 12px))',
          backgroundSize: '200% 100%',
          mixBlendMode: 'difference',
        } as object
      }
    />
    <div
      className="absolute inset-0 z-[-1]"
      style={
        {
          maskImage,
          maskComposite: 'intersect',
          animation: 'fd-moving-banner 20s linear infinite',
          '--start': 'rgba(255,120,120,0.5)',
          '--mid': 'rgba(36,188,255,0.4)',
          '--end': 'rgba(64,0,255,0.51)',
          '--via': 'rgba(255,89,0,0.56)',
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--end), var(--start) 4%, var(--start) 8%, transparent 9%, transparent 14%, var(--mid) 16%, var(--mid) 20%, transparent, var(--via) 36%, var(--via) 40%, transparent 42%, var(--end) 46%, var(--end) calc(50% - 16.8px))',
          backgroundSize: '200% 100%',
          mixBlendMode: 'color-dodge',
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
