import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';
import { UploadContextDto } from '../dto/upload-context.dto';
import { UploadFileItemDto } from '../dto/upload-file-item.dto';
import { UploadMultipleResponseDto } from '../dto/upload-multiple-response.dto';
import { UploadSingleResponseDto } from '../dto/upload-single-response.dto';
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  UPLOAD_STORAGE_PROVIDER,
} from '../constants/upload.constants';
import { StoredUploadFile } from '../interfaces/stored-upload-file.interface';
import type { UploadStorageProvider } from '../interfaces/upload-storage-provider.interface';
import { UploadedFileLike } from '../interfaces/uploaded-file.interface';

@Injectable()
export class UploadService {
  constructor(
    private readonly configService: ConfigService,
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

    this.validateFileSafety(file);
    this.runScanHook(file);

    const uploadedFile = await this.uploadStorageProvider.save(
      file,
      optimize,
      context,
    );

    return {
      file: this.withPublicUrl(uploadedFile),
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

    files.forEach((file) => this.validateFileSafety(file));
    files.forEach((file) => this.runScanHook(file));

    const uploadedFiles = await Promise.all(
      files.map((file) =>
        this.uploadStorageProvider.save(file, optimize, context),
      ),
    );

    return {
      count: uploadedFiles.length,
      files: uploadedFiles.map((file) => this.withPublicUrl(file)),
    };
  }

  private withPublicUrl(file: StoredUploadFile): UploadFileItemDto {
    const publicBaseUrl = (
      this.configService.get<string>('public.baseUrl') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');

    return {
      ...file,
      url: `${publicBaseUrl}/${file.path.replace(/^\/+/, '')}`,
    };
  }

  private validateFileSafety(file: UploadedFileLike) {
    const normalizedMime = file.mimetype.toLowerCase();
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimes = new Set(ALLOWED_UPLOAD_MIME_TYPES);
    const allowedExtensions = new Set(ALLOWED_UPLOAD_EXTENSIONS);

    if (
      !allowedMimes.has(
        normalizedMime as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed types: ${ALLOWED_UPLOAD_MIME_TYPES.join(', ')}`,
      );
    }

    if (
      !allowedExtensions.has(
        extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number],
      )
    ) {
      throw new BadRequestException(
        `Unsupported file extension: ${extension || '(none)'}. Allowed extensions: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`,
      );
    }

    if (!this.contentLooksLikeDeclaredMime(file.buffer, normalizedMime)) {
      throw new BadRequestException(
        'File content does not match declared MIME type.',
      );
    }
  }

  private contentLooksLikeDeclaredMime(buffer: Buffer, mime: string) {
    if (mime === 'image/jpeg') {
      return (
        buffer.length > 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }
    if (mime === 'image/png') {
      return (
        buffer.length > 7 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }
    if (mime === 'image/gif') {
      return (
        buffer.length > 5 && buffer.toString('ascii', 0, 6).startsWith('GIF8')
      );
    }
    if (mime === 'image/webp') {
      return (
        buffer.length > 11 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    }
    if (mime === 'application/pdf') {
      return buffer.length > 4 && buffer.toString('ascii', 0, 5) === '%PDF-';
    }
    if (mime === 'text/plain') {
      return true;
    }

    return false;
  }

  private runScanHook(file: UploadedFileLike) {
    const scanEnabled = this.configService.get<boolean>(
      'upload.enableScan',
      false,
    );
    if (!scanEnabled) {
      return;
    }

    if (file.buffer.length === 0) {
      throw new BadRequestException('Empty files are not allowed');
    }
  }
}
