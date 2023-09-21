'use client'

import { default_image_sizes } from '@/mdx'
import Image, { type ImageProps } from 'next/image'
import { type ImgHTMLAttributes } from 'react'
import Zoom from 'react-medium-image-zoom'

export type ImageZoomProps = ImageProps & {
  /**
   * Image props when zoom in
   */
  zoomInProps?: ImgHTMLAttributes<HTMLImageElement>
}

export function ImageZoom({ zoomInProps, ...props }: ImageZoomProps) {
  return (
    <Zoom
      zoomMargin={20}
      wrapElement="span"
      zoomImg={{
        src: props.src as string,
        sizes: undefined,
        ...zoomInProps
      }}
    >
      <Image sizes={default_image_sizes} {...props} />
    </Zoom>
  )
}
