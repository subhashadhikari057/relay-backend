import { UploadContext } from './upload-context.interface';
import { StoredUploadFile } from './stored-upload-file.interface';
import { UploadedFileLike } from './uploaded-file.interface';

export interface UploadStorageProvider {
  save(
    file: UploadedFileLike,
    optimize: boolean,
    context: UploadContext,
  ): Promise<StoredUploadFile>;
}
