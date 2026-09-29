export type ImageType =
  | 'avif'
  | 'bmp'
  | 'gif'
  | 'heic'
  | 'heif'
  | 'ico'
  | 'jpg'
  | 'png'
  | 'psd'
  | 'svg'
  | 'tiff'
  | 'webp';

export interface ImageSize {
  /** in pixels */
  width: number;
  /** in pixels */
  height: number;
}

export interface ImageSizeResult extends ImageSize {
  type: ImageType;
  mime: string;

  /**
   * Every size a multi-size container holds (ICO, and AVIF collections).
   * Only set when there is more than one, `width`/`height` hold the largest.
   */
  variants?: ImageSize[];
}

/**
 * Returns `undefined` when the data isn't this format *or* when it doesn't hold
 * enough bytes yet — callers retry with more data rather than distinguishing.
 */
export type Parser = (data: Uint8Array) => ImageSizeResult | undefined;
