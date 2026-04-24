import { UploadContext } from './upload-context.interface';

export interface StoredUploadFile {
  path: string;
  url?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  optimized: boolean;
  context: UploadContext;
}
