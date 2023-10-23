'use client'

import { default_image_sizes } from '@/utils/config'
import Image, { type ImageProps } from 'next/image'
import { type ImgHTMLAttributes } from 'react'
import Zoom from 'react-medium-image-zoom'

export type ImageZoomProps = ImageProps & {
  /**
   * Image props when zoom in
   */
  zoomInProps?: ImgHTMLAttributes<HTMLImageElement>
}

function getImageSrc(src: ImageProps['src']): string {
  return typeof src === 'string'
    ? src
    : 'default' in src
    ? src.default.src
    : src.src
}

export function ImageZoom({ zoomInProps, children, ...props }: ImageZoomProps) {
  return (
    <Zoom
      zoomMargin={20}
      wrapElement="span"
      zoomImg={{
        src: getImageSrc(props.src),
        sizes: undefined,
        ...zoomInProps
      }}
    >
      {children ?? <Image sizes={default_image_sizes} {...props} />}
    </Zoom>
  )
}
