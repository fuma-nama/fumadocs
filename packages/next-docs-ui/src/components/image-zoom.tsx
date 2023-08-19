import { cn } from '@/utils/cn'
import { DialogClose } from '@radix-ui/react-dialog'
import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'

export type ImageZoomProps = ImageProps & {
  /**
   * Image props when zoom in
   */
  zoomInProps?: ImageProps
  /**
   * Image props when zoom out
   */
  zoomOutProps?: ImageProps
}

export function ImageZoom({
  zoomInProps,
  zoomOutProps,
  ...props
}: ImageZoomProps) {
  const [zoom, setZoom] = useState(false)

  return (
    <Dialog open={zoom} onOpenChange={setZoom}>
      <DialogTrigger asChild>
        <Image
          sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 70vw, 800px"
          {...props}
          {...zoomOutProps}
          className={cn('nd-cursor-zoom-in nd-rounded-lg', props.className)}
        />
      </DialogTrigger>
      <DialogContent className="!nd-w-[90vw] nd-max-w-4xl nd-p-0">
        <DialogClose asChild>
          <Image
            sizes="(max-width: 900px) 90vw, 900px"
            {...props}
            {...zoomInProps}
            className={cn(
              'nd-cursor-zoom-out nd-w-full nd-rounded-lg',
              props.className
            )}
          />
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
