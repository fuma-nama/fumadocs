import { type ReactNode } from 'react';
import { Banner } from 'fumadocs-ui/components/banner';

export default function Preview(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <Banner className="z-0" changeLayout={false}>
        Be careful, Fumadocs v99 has released
      </Banner>

      <Banner
        className="z-0"
        id="test-rainbow"
        variant="rainbow"
        changeLayout={false}
      >
        Using the <code>rainbow</code> variant
      </Banner>

      <Banner className="z-0" id="test" changeLayout={false}>
        Be careful, this banner can be closed
      </Banner>
    </div>
  );
}
