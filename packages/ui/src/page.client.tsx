'use client';

import { useLayoutEffect, useState } from 'react';
import { useI18n } from './contexts/i18n';

export * from '@/components/toc';
export * from '@/components/breadcrumb';

export function LastUpdate(props: { date: Date }): JSX.Element {
  const lastUpdate = useI18n().text.lastUpdate ?? 'Last updated on';
  const [date, setDate] = useState('');

  useLayoutEffect(() => {
    // to the timezone of client
    setDate(props.date.toLocaleDateString());
  }, [props.date]);

  return (
    <p className="mt-8 text-xs text-muted-foreground">
      {lastUpdate} {date}
    </p>
  );
}
