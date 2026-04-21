import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadedFileLike } from '../interfaces/uploaded-file.interface';

describe('UploadService', () => {
  const uploadStorageProvider = {
    save: jest.fn(),
  };

  let service: UploadService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new UploadService(uploadStorageProvider);
  });

  it('uploads single file and returns wrapped response', async () => {
    uploadStorageProvider.save.mockResolvedValueOnce({
      path: 'uploads/2026/04/22/file.jpg',
      fileName: 'file.jpg',
      originalName: 'a.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      optimized: true,
      context: {},
    });

    const result = await service.uploadSingle(
      { originalname: 'a.jpg' } as UploadedFileLike,
      true,
      {},
    );

    expect(uploadStorageProvider.save).toHaveBeenCalledTimes(1);
    expect(result.file.path).toBe('uploads/2026/04/22/file.jpg');
  });

  it('throws when single file is missing', async () => {
    await expect(service.uploadSingle(undefined, false, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when multiple files are missing', async () => {
    await expect(service.uploadMultiple([], false, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('uploads multiple files and returns count', async () => {
    uploadStorageProvider.save
      .mockResolvedValueOnce({
        path: 'uploads/2026/04/22/one.jpg',
        fileName: 'one.jpg',
        originalName: 'one.jpg',
        mimeType: 'image/jpeg',
        size: 1200,
        optimized: false,
        context: {},
      })
      .mockResolvedValueOnce({
        path: 'uploads/2026/04/22/two.png',
        fileName: 'two.png',
        originalName: 'two.png',
        mimeType: 'image/png',
        size: 900,
        optimized: false,
        context: {},
      });

    const result = await service.uploadMultiple(
      [
        { originalname: 'one.jpg' } as UploadedFileLike,
        { originalname: 'two.png' } as UploadedFileLike,
      ],
      false,
      {},
    );

    expect(uploadStorageProvider.save).toHaveBeenCalledTimes(2);
    expect(result.count).toBe(2);
    expect(result.files[0]?.path).toBe('uploads/2026/04/22/one.jpg');
  });
});
