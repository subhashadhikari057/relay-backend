import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadAdminController } from './admin/upload.admin.controller';
import { UploadMobileController } from './mobile/upload.mobile.controller';
import { UPLOAD_STORAGE_PROVIDER } from './shared/constants/upload.constants';
import { LocalUploadStorageProvider } from './shared/services/local-upload-storage.provider';
import { UploadService } from './shared/services/upload.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadMobileController, UploadAdminController],
  providers: [
    UploadService,
    LocalUploadStorageProvider,
    {
      provide: UPLOAD_STORAGE_PROVIDER,
      useExisting: LocalUploadStorageProvider,
    },
  ],
})
export class UploadModule {}
