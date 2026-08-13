export type ImageSizeErrorCode =
  /** the bytes aren't a supported image */
  | 'ECONTENT'
  /** the server answered with a non-2xx status */
  | 'EHTTP'
  /** the request outlived `timeout` */
  | 'ETIMEDOUT';

export class ImageSizeError extends Error {
  code?: ImageSizeErrorCode;
  /** HTTP status, set when `code` is `EHTTP`. */
  statusCode?: number;

  constructor(message: string, code?: ImageSizeErrorCode, statusCode?: number) {
    super(message);
    this.name = 'ImageSizeError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
