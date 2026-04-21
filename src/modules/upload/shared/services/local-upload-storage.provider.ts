import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { UploadContext } from '../interfaces/upload-context.interface';
import { StoredUploadFile } from '../interfaces/stored-upload-file.interface';
import { UploadedFileLike } from '../interfaces/uploaded-file.interface';
import { UploadStorageProvider } from '../interfaces/upload-storage-provider.interface';

const execFileAsync = promisify(execFile);

@Injectable()
export class LocalUploadStorageProvider implements UploadStorageProvider {
  private readonly logger = new Logger(LocalUploadStorageProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async save(
    file: UploadedFileLike,
    optimize: boolean,
    context: UploadContext,
  ): Promise<StoredUploadFile> {
    const now = new Date();
    const year = `${now.getUTCFullYear()}`;
    const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${now.getUTCDate()}`.padStart(2, '0');
    const root =
      this.configService.get<string>('upload.localRoot') ?? 'uploads';
    const relativeDir = path.posix.join(root, year, month, day);
    const absoluteDir = path.join(process.cwd(), relativeDir);
    const id = randomUUID();

    await mkdir(absoluteDir, { recursive: true });

    const originalExtension = this.normalizeExtension(file.originalname);
    let outputExtension = originalExtension;
    let outputMimeType = file.mimetype;
    let outputBuffer = file.buffer;
    let optimized = false;

    if (optimize && file.mimetype.startsWith('image/')) {
      const optimizedResult = await this.optimizeImage(
        file.buffer,
        outputExtension,
        outputMimeType,
      );
      outputBuffer = optimizedResult.buffer;
      outputExtension = optimizedResult.extension;
      outputMimeType = optimizedResult.mimeType;
      optimized = optimizedResult.optimized;
    }

    const fileName = `${id}${outputExtension}`;
    const relativePath = path.posix.join(relativeDir, fileName);
    const absolutePath = path.join(process.cwd(), relativePath);

    await writeFile(absolutePath, outputBuffer);

    return {
      path: relativePath,
      fileName,
      originalName: file.originalname,
      mimeType: outputMimeType,
      size: outputBuffer.byteLength,
      optimized,
      context: { ...context },
    };
  }

  private normalizeExtension(originalName: string) {
    const extension = path.extname(originalName).toLowerCase().trim();
    return extension || '.bin';
  }

  private async optimizeImage(
    buffer: Buffer,
    fallbackExtension: string,
    fallbackMimeType: string,
  ): Promise<{
    buffer: Buffer;
    extension: string;
    mimeType: string;
    optimized: boolean;
  }> {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), 'relay-upload-'));
    const inputPath = path.join(tempDirectory, 'input.img');
    const outputPath = path.join(tempDirectory, 'output.jpg');

    try {
      await writeFile(inputPath, buffer);

      await execFileAsync('sips', [
        '-s',
        'format',
        'jpeg',
        '-s',
        'formatOptions',
        '80',
        inputPath,
        '--out',
        outputPath,
      ]);

      const optimizedBuffer = await readFile(outputPath);

      return {
        buffer: optimizedBuffer,
        extension: '.jpg',
        mimeType: 'image/jpeg',
        optimized: true,
      };
    } catch (error) {
      this.logger.warn(
        'Image optimization skipped, original image will be stored.',
      );
      if (error instanceof Error) {
        this.logger.debug(error.message);
      }
      return {
        buffer,
        extension: fallbackExtension,
        mimeType: fallbackMimeType,
        optimized: false,
      };
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }
}
