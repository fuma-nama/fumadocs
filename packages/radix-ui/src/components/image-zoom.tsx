'use client';

import { Image, type ImageProps } from 'fumadocs-core/framework';
import {
  type ComponentProps,
  createContext,
  type CSSProperties,
  type ReactNode,
  use,
  useRef,
  useState,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import Zoom, { type UncontrolledProps } from 'react-medium-image-zoom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import './image-zoom.css';

export type ImageZoomProps = ImageProps & {
  /**
   * Image props when zoom in
   */
  zoomInProps?: ComponentProps<'img'>;

  /**
   * Props for `react-medium-image-zoom`, unused inside `<Lightbox />`
   */
  rmiz?: UncontrolledProps;

  /**
   * Caption in `<Lightbox />`
   *
   * @defaultValue `title`
   */
  caption?: ReactNode;
};

interface Item {
  element: HTMLElement;
  image: ComponentProps<'img'>;
  caption?: ReactNode;
}

interface Slide extends Item {
  style?: CSSProperties;
}

const LightboxContext = createContext<{
  register: (item: Item) => () => void;
  open: (element: HTMLElement) => void;
} | null>(null);

function getImageSrc(src: ImageProps['src']): string {
  if (typeof src === 'string') return src;

  if (typeof src === 'object') {
    // Next.js
    if ('default' in src) return (src as { default: { src: string } }).default.src;
    return src.src;
  }

  return '';
}

export function ImageZoom({ zoomInProps, children, rmiz, caption, ...props }: ImageZoomProps) {
  const lightbox = use(LightboxContext);
  const zoomImg = { src: getImageSrc(props.src), sizes: undefined, ...zoomInProps };
  const image = children ?? (
    <Image sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px" {...props} />
  );

  if (lightbox) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        ref={(element) => {
          if (!element) return;
          return lightbox.register({
            element,
            image: { alt: props.alt, ...zoomImg },
            caption: caption ?? props.title,
          });
        }}
        onClick={(e) => {
          if (e.target !== e.currentTarget) lightbox.open(e.currentTarget);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          lightbox.open(e.currentTarget);
        }}
        className="block outline-none [&_img]:cursor-zoom-in [&:focus-visible_img]:ring-2 [&:focus-visible_img]:ring-fd-ring"
      >
        {image}
      </span>
    );
  }

  return (
    <Zoom zoomMargin={20} wrapElement="span" {...rmiz} zoomImg={zoomImg}>
      {image}
    </Zoom>
  );
}

/**
 * Browse the zoomable images inside in one viewer
 */
export function Lightbox({ children }: { children: ReactNode }) {
  const t = useTranslations({ note: 'image zoom' });
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [context] = useState(() => {
    const items = new Set<Item>();

    return {
      register(item: Item) {
        items.add(item);
        return () => void items.delete(item);
      },
      open(element: HTMLElement) {
        const list: Slide[] = [];
        for (const item of items) {
          if (!item.element.checkVisibility()) continue;
          const img = item.element.querySelector('img');
          list.push({ ...item, style: img ? getSlideStyle(img) : undefined });
        }
        list.sort((a, b) =>
          a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
        );
        const index = list.findIndex((slide) => slide.element === element);

        transition(getImage(element), () => {
          flushSync(() => setSlides(list));
          const slide = scrollerRef.current!.children[index];
          slide.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'instant' });
          return slide.querySelector('img')!;
        });
      },
    };
  });

  function close() {
    const scroller = scrollerRef.current;
    if (!scroller || !slides) return;
    const index = getIndex(scroller);
    const { element } = slides[index];

    transition(scroller.children[index].querySelector('img')!, () => {
      flushSync(() => setSlides(null));
      element.focus({ preventScroll: true });
      const image = getImage(element);
      image.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      return image;
    });
  }

  function navigate(step: number) {
    const scroller = scrollerRef.current!;
    scroller.children[getIndex(scroller) + step]?.scrollIntoView({
      block: 'nearest',
      inline: 'start',
      behavior: 'smooth',
    });
  }

  return (
    <LightboxContext value={context}>
      {children}
      {slides &&
        createPortal(
          <dialog
            ref={initDialog}
            tabIndex={-1}
            aria-label={t('Image Viewer', { note: 'aria-label' })}
            onCancel={(e) => {
              e.preventDefault();
              close();
            }}
            onClose={() => setSlides(null)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              e.preventDefault();
              const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
              navigate((e.key === 'ArrowRight') !== rtl ? 1 : -1);
            }}
            className="m-0 size-full max-h-none max-w-none overflow-hidden border-none bg-fd-background p-0 text-fd-foreground outline-none"
          >
            <button
              type="button"
              aria-label={t('Close', { note: 'aria-label' })}
              onClick={close}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  size: 'icon-sm',
                  className: 'absolute top-3.25 inset-e-2.5',
                }),
              )}
            >
              <X />
            </button>
            <div
              ref={scrollerRef}
              onClick={(e) => {
                if (!(e.target as Element).closest('figcaption')) close();
              }}
              className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
            >
              {slides.map((slide, i) => (
                <figure
                  key={i}
                  className="flex w-full shrink-0 snap-start snap-always flex-col items-center pb-6"
                >
                  <p className="flex h-14 w-full items-center px-4 text-sm text-fd-muted-foreground tabular-nums">
                    {slides.length > 1 && `${i + 1} / ${slides.length}`}
                  </p>
                  <div className="flex min-h-0 w-full flex-1 items-center justify-center px-4 [container-type:size] md:px-16">
                    <img
                      loading="lazy"
                      {...slide.image}
                      style={slide.style}
                      className={cn('max-h-full cursor-zoom-out bg-cover', slide.image.className)}
                    />
                  </div>
                  {slide.caption && (
                    <figcaption className="prose prose-sm mt-4 px-4 text-center text-fd-muted-foreground md:px-16">
                      {slide.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label={t('Previous Image', { note: 'aria-label' })}
                  onClick={() => navigate(-1)}
                  className={cn(
                    buttonVariants({
                      variant: 'ghost',
                      size: 'icon',
                      className: 'absolute top-1/2 inset-s-2.5 -translate-y-1/2 max-md:hidden',
                    }),
                  )}
                >
                  <ChevronLeft className="rtl:-scale-x-100" />
                </button>
                <button
                  type="button"
                  aria-label={t('Next Image', { note: 'aria-label' })}
                  onClick={() => navigate(1)}
                  className={cn(
                    buttonVariants({
                      variant: 'ghost',
                      size: 'icon',
                      className: 'absolute top-1/2 inset-e-2.5 -translate-y-1/2 max-md:hidden',
                    }),
                  )}
                >
                  <ChevronRight className="rtl:-scale-x-100" />
                </button>
              </>
            )}
          </dialog>,
          document.body,
        )}
    </LightboxContext>
  );
}

function initDialog(element: HTMLDialogElement) {
  // Strict Mode runs ref callbacks twice
  if (!element.open) element.showModal();
  element.focus();
  const { style } = document.documentElement;
  const overflow = style.overflow;
  style.overflow = 'hidden';
  return () => {
    style.overflow = overflow;
  };
}

function getIndex(scroller: HTMLElement) {
  return Math.round(Math.abs(scroller.scrollLeft) / scroller.clientWidth);
}

function getImage(element: HTMLElement): HTMLElement {
  return element.querySelector('img') ?? element;
}

// sized from the page image, so the slide has its final box before loading
function getSlideStyle(img: HTMLImageElement): CSSProperties {
  const ratio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);

  return {
    width: ratio ? `min(100cqw, ${ratio} * 100cqh)` : undefined,
    aspectRatio: ratio ? `auto ${ratio}` : undefined,
    backgroundImage: img.currentSrc ? `url(${JSON.stringify(img.currentSrc)})` : undefined,
  };
}

/**
 * morph `from` into the element returned by `update`
 */
function transition(from: HTMLElement, update: () => HTMLElement) {
  if (
    !('startViewTransition' in document) ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    update();
    return;
  }

  let to: HTMLElement | undefined;
  from.style.viewTransitionName = 'fd-lightbox';
  document
    .startViewTransition(() => {
      from.style.viewTransitionName = '';
      to = update();
      to.style.viewTransitionName = 'fd-lightbox';
    })
    .finished.finally(() => {
      if (to) to.style.viewTransitionName = '';
    });
}
