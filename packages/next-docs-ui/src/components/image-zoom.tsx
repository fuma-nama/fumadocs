'use client'

import Image, { type ImageProps } from 'next/image'
import { type ImgHTMLAttributes } from 'react'
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'

export type ImageZoomProps = ImageProps & {
  /**
   * Image props when zoom in
   */
  zoomInProps?: ImgHTMLAttributes<HTMLImageElement>
}

export function ImageZoom({ zoomInProps, ...props }: ImageZoomProps) {
  return (
    <Zoom
      wrapElement="span"
      zoomMargin={40}
      zoomImg={{
        src: props.src as string,
        sizes: undefined,
        ...zoomInProps
      }}
    >
      <Image
        sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 70vw, 800px"
        {...props}
      />
    </Zoom>
  )
}
