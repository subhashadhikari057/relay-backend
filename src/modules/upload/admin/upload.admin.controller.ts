import {
  Body,
  Controller,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import { PermissionAction } from 'src/modules/permissions/constants/permission-actions.constant';
import { PlatformPermissionResource } from 'src/modules/permissions/constants/permission-resources.constant';
import { PermissionScope } from 'src/modules/permissions/constants/permission-scope.constant';
import { RequirePermission } from 'src/modules/permissions/decorators/require-permission.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import {
  MAX_MULTIPLE_FILES_COUNT,
  MAX_SINGLE_FILE_SIZE_BYTES,
} from '../shared/constants/upload.constants';
import { UploadContextDto } from '../shared/dto/upload-context.dto';
import { UploadMultipleRequestDto } from '../shared/dto/upload-multiple-request.dto';
import { UploadMultipleResponseDto } from '../shared/dto/upload-multiple-response.dto';
import { UploadQueryDto } from '../shared/dto/upload-query.dto';
import { UploadSingleRequestDto } from '../shared/dto/upload-single-request.dto';
import { UploadSingleResponseDto } from '../shared/dto/upload-single-response.dto';
import { UploadedFileLike } from '../shared/interfaces/uploaded-file.interface';
import { UploadService } from '../shared/services/upload.service';

@Controller('api/admin/upload')
@ApiTags('Admin Upload')
@UseGuards(AccessTokenGuard, PermissionGuard)
@ApiBearerAuth('bearer')
export class UploadAdminController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.UPLOAD,
    action: PermissionAction.write,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_SINGLE_FILE_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    operationId: 'adminUploadSingle',
    summary: 'Upload Single File',
    description:
      'Upload one file for admin user. Supports optional image optimization and context metadata.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UploadSingleRequestDto,
    description: 'Single file upload request.',
  })
  @ApiOkResponse({
    type: UploadSingleResponseDto,
    description: 'Single file uploaded successfully.',
  })
  uploadSingle(
    @UploadedFile() file: UploadedFileLike | undefined,
    @Query() query: UploadQueryDto,
    @Body() context: UploadContextDto,
  ) {
    return this.uploadService.uploadSingle(
      file,
      query.optimize ?? false,
      context,
    );
  }

  @Post('multiple')
  @RequirePermission({
    scope: PermissionScope.platform,
    resource: PlatformPermissionResource.UPLOAD,
    action: PermissionAction.write,
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_MULTIPLE_FILES_COUNT, {
      limits: {
        fileSize: MAX_SINGLE_FILE_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    operationId: 'adminUploadMultiple',
    summary: 'Upload Multiple Files',
    description:
      'Upload multiple files for admin user. Supports optional image optimization and context metadata.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UploadMultipleRequestDto,
    description: 'Multiple file upload request.',
  })
  @ApiOkResponse({
    type: UploadMultipleResponseDto,
    description: 'Multiple files uploaded successfully.',
  })
  uploadMultiple(
    @UploadedFiles() files: UploadedFileLike[] | undefined,
    @Query() query: UploadQueryDto,
    @Body() context: UploadContextDto,
  ) {
    return this.uploadService.uploadMultiple(
      files,
      query.optimize ?? false,
      context,
    );
  }
}
