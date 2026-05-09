import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';

export interface UploadResult {
  url: string;
  key: string;
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_BYTES = 100;

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly hasR2: boolean;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET') ?? 'getx-uploads';
    this.publicUrl = config.get<string>('R2_PUBLIC_URL') ?? '';

    this.hasR2 = Boolean(accountId && accessKeyId && secretAccessKey);

    if (this.hasR2 && accountId && accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log('Cloudflare R2 configured');
    } else {
      this.s3 = null;
      this.logger.warn(
        'R2 not configured. Upload endpoint returns base64 data URLs (dev mode).',
      );
    }
  }

  async uploadImage(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
  ): Promise<UploadResult> {
    this.validateImage(buffer, mimeType);

    const ext = this.getExtension(originalName, mimeType);
    const key = `requests/${userId}/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;

    if (!this.s3 || !this.hasR2) {
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return { url: dataUrl, key };
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000',
      }),
    );

    const url = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucket}.r2.dev/${key}`;
    return { url, key };
  }

  private validateImage(buffer: Buffer, mimeType: string): void {
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new BadRequestException(`Unsupported image type: ${mimeType}`);
    }
    if (buffer.length > MAX_BYTES) {
      throw new BadRequestException('Image must be less than 5MB');
    }
    if (buffer.length < MIN_BYTES) {
      throw new BadRequestException('Image too small or corrupted');
    }
  }

  private getExtension(filename: string, mimeType: string): string {
    const fromMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    if (fromMime[mimeType]) return fromMime[mimeType];
    const dot = filename.lastIndexOf('.');
    if (dot >= 0 && dot < filename.length - 1) {
      return filename.slice(dot + 1).toLowerCase();
    }
    return 'bin';
  }
}
