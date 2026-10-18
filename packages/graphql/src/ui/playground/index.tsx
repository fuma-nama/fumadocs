'use client';
import { lazy, Suspense } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from '@fuma-translate/react';
import { DialogPopup, PlaygroundTrigger } from 'shared-api/components/dialog';
import { Spinner } from 'shared-api/components/spinner';
import { StatusDot } from 'shared-api/components/playground/log';
import { usePlayground } from '@/playground';
import { OperationBar } from '@/ui/operation/bar';

const loadDialog = () => import('./dialog');
const PlaygroundDialog = lazy(loadDialog);

/**
 * The bar of operation with a playground dialog to send it.
 */
export function OperationPlayground() {
  const t = useTranslations({ note: 'graphql playground' });
  const playground = usePlayground();
  const { status } = playground;

  return (
    <Dialog.Root onOpenChange={(open) => open && playground.open()}>
      <OperationBar>
        {/* the dialog loads from the first sign of intent */}
        <PlaygroundTrigger onPointerEnter={loadDialog} onFocus={loadDialog}>
          {status !== 'closed' && (
            <StatusDot
              status={status}
              activity={playground.log.at(-1)?.id}
              label={status === 'open' ? t('Subscribed') : t('Subscribing')}
              className="ring-fd-primary-foreground/30"
            />
          )}
        </PlaygroundTrigger>
      </OperationBar>
      <DialogPopup className="sm:h-[min(52rem,calc(100dvh-3rem))] sm:w-[min(80rem,calc(100vw-3rem))]">
        <Suspense fallback={<Spinner className="m-auto size-4 text-fd-muted-foreground" />}>
          <PlaygroundDialog playground={playground} />
        </Suspense>
      </DialogPopup>
    </Dialog.Root>
  );
}
