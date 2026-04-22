export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size?: number;
}
