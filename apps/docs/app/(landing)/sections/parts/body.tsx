'use client';
import type { ReactNode } from 'react';
import { Column } from './column';
import { type Snippets, useSwap } from './swap';
import { Stage } from './stage';

/**
 * Both layouts of the figure on one state of swaps: the pinned stage on large, tall enough
 * screens with motion and JS, the column everywhere else.
 */
export function Body({
  code,
  page,
  snippets,
}: {
  code: ReactNode;
  page: ReactNode;
  snippets: Snippets;
}) {
  const { state, actions } = useSwap();
  return (
    <>
      <div className="hidden xl:motion-safe:[@media(min-height:784px)]:block [@media(scripting:none)]:hidden!">
        <Stage swap={state} actions={actions} page={page} snippets={snippets} />
      </div>
      <div className="xl:motion-safe:[@media(min-height:784px)]:hidden [@media(scripting:none)]:block!">
        <Column swap={state} actions={actions} code={code} page={page} snippets={snippets} />
      </div>
    </>
  );
}
