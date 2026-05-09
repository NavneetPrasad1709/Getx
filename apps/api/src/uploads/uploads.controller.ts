import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadsService, type UploadResult } from './uploads.service';

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post('image')
  @Throttle({ default: { limit: 30, ttl: 600_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  uploadImage(
    @UploadedFile() file: MulterFile | undefined,
    @CurrentUser('id') userId: string,
  ): Promise<UploadResult> {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.uploads.uploadImage(
      file.buffer,
      file.originalname,
      file.mimetype,
      userId,
    );
  }
}
