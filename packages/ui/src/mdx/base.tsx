import { type ImgHTMLAttributes, type TableHTMLAttributes } from 'react';
import NextImage from 'next/image';
import type { ImageProps } from 'next/image';
import { defaultImageSizes } from '@/utils/shared';

export function Image(props: ImgHTMLAttributes<HTMLImageElement>): JSX.Element {
  return <NextImage sizes={defaultImageSizes} {...(props as ImageProps)} />;
}

export function Table(
  props: TableHTMLAttributes<HTMLTableElement>,
): JSX.Element {
  return (
    <div className="relative overflow-auto">
      <table {...props} />
    </div>
  );
}
