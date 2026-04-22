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

@Controller('api/mobile/upload')
@ApiTags('Mobile Upload')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth('bearer')
export class UploadMobileController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_SINGLE_FILE_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    operationId: 'mobileUploadSingle',
    summary: 'Upload Single File',
    description:
      'Upload one file for mobile user. Supports optional image optimization and context metadata.',
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
  @UseInterceptors(
    FilesInterceptor('files', MAX_MULTIPLE_FILES_COUNT, {
      limits: {
        fileSize: MAX_SINGLE_FILE_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    operationId: 'mobileUploadMultiple',
    summary: 'Upload Multiple Files',
    description:
      'Upload multiple files for mobile user. Supports optional image optimization and context metadata.',
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
