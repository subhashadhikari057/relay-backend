import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  const uploadStorageProvider = {
    save: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue(false),
  };

  let service: UploadService;

  beforeEach(() => {
    jest.resetAllMocks();
    configService.get.mockReturnValue(false);
    service = new UploadService(configService as never, uploadStorageProvider);
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
      {
        originalname: 'a.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb]),
      },
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
        {
          originalname: 'one.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb]),
        },
        {
          originalname: 'two.png',
          mimetype: 'image/png',
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        },
      ],
      false,
      {},
    );

    expect(uploadStorageProvider.save).toHaveBeenCalledTimes(2);
    expect(result.count).toBe(2);
    expect(result.files[0]?.path).toBe('uploads/2026/04/22/one.jpg');
  });
});
