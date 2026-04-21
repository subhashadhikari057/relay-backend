import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UploadContextDto } from '../dto/upload-context.dto';
import { UploadMultipleResponseDto } from '../dto/upload-multiple-response.dto';
import { UploadSingleResponseDto } from '../dto/upload-single-response.dto';
import { UPLOAD_STORAGE_PROVIDER } from '../constants/upload.constants';
import type { UploadStorageProvider } from '../interfaces/upload-storage-provider.interface';
import { UploadedFileLike } from '../interfaces/uploaded-file.interface';

@Injectable()
export class UploadService {
  constructor(
    @Inject(UPLOAD_STORAGE_PROVIDER)
    private readonly uploadStorageProvider: UploadStorageProvider,
  ) {}

  async uploadSingle(
    file: UploadedFileLike | undefined,
    optimize: boolean,
    context: UploadContextDto,
  ): Promise<UploadSingleResponseDto> {
    if (!file) {
      throw new BadRequestException('No file was provided');
    }

    const uploadedFile = await this.uploadStorageProvider.save(
      file,
      optimize,
      context,
    );

    return {
      file: uploadedFile,
    };
  }

  async uploadMultiple(
    files: UploadedFileLike[] | undefined,
    optimize: boolean,
    context: UploadContextDto,
  ): Promise<UploadMultipleResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files were provided');
    }

    const uploadedFiles = await Promise.all(
      files.map((file) =>
        this.uploadStorageProvider.save(file, optimize, context),
      ),
    );

    return {
      count: uploadedFiles.length,
      files: uploadedFiles,
    };
  }
}
