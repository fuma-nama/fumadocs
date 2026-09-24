'use client';
import { type MouseEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from '@fuma-translate/react';

export function useCopyButton(
  onCopy: () => void | Promise<void>,
): [checked: boolean, onClick: MouseEventHandler, message: string] {
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState('');
  const callbackRef = useRef(onCopy);
  const timeoutRef = useRef<number | null>(null);
  const t = useTranslations({ note: 'copy button status, announced to screen readers' });
  const tRef = useRef(t);

  callbackRef.current = onCopy;
  tRef.current = t;

  const onClick: MouseEventHandler = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setMessage('');

    let res;
    try {
      res = Promise.resolve(callbackRef.current());
    } catch (error) {
      res = Promise.reject(error);
    }

    void res.then(
      () => {
        setChecked(true);
        setMessage(tRef.current('Copied to clipboard'));
        timeoutRef.current = window.setTimeout(() => {
          setChecked(false);
          setMessage('');
        }, 1500);
      },
      () => {
        setChecked(false);
        setMessage(tRef.current('Failed to copy'));
      },
    );
  }, []);

  // Avoid updates after being unmounted
  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return [checked, onClick, message];
}
