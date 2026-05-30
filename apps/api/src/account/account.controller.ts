import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { DataExportRequest, KycDocument } from '@getx/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccountService } from './account.service';
import {
  ChangePasswordSchema,
  DeleteAccountSchema,
  SubmitKycSchema,
  UpdateNotificationsSchema,
  UpdateProfileSchema,
} from './dto/account.dto';

@Controller('account')
export class AccountController {
  constructor(private account: AccountService) {}

  @Get('notifications')
  notifications(@CurrentUser('id') userId: string): Promise<{
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingOptIn: boolean;
  }> {
    return this.account.getNotificationPrefs(userId);
  }

  @Patch('profile')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<{ success: true }> {
    const dto = UpdateProfileSchema.parse(body);
    return this.account.updateProfile(userId, dto);
  }

  @Patch('notifications')
  updateNotifications(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<{ success: true }> {
    const dto = UpdateNotificationsSchema.parse(body);
    return this.account
      .updateNotificationPrefs(userId, dto)
      .then(() => ({ success: true as const }));
  }

  @Post('password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    const dto = ChangePasswordSchema.parse(body);
    return this.account.changePassword(userId, dto, req.ip);
  }

  @Get('kyc')
  kycStatus(@CurrentUser('id') userId: string) {
    return this.account.getKycStatus(userId);
  }

  @Post('kyc')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  submitKyc(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<KycDocument> {
    const dto = SubmitKycSchema.parse(body);
    return this.account.submitKyc(userId, dto);
  }

  /* Sumsub WebSDK access token — short-lived (10 min). Frontend exchanges
     it for the iframe URL. Non-IN users use this flow; IN users continue
     to use the Aadhaar form via POST /account/kyc above. */
  // RES-HIGH-056: 3/hour — per-token Sumsub cost + vendor rate limit
  @Get('kyc/sumsub-token')
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  sumsubToken(
    @CurrentUser('id') userId: string,
  ): Promise<{ token: string; userId: string; mock: boolean }> {
    return this.account.getSumsubAccessToken(userId);
  }

  @Get('data-export')
  listDataExports(
    @CurrentUser('id') userId: string,
  ): Promise<DataExportRequest[]> {
    return this.account.listDataExports(userId);
  }

  @Post('data-export')
  @Throttle({ default: { limit: 2, ttl: 60_000 * 60 * 24 } })
  @HttpCode(HttpStatus.ACCEPTED)
  requestDataExport(
    @CurrentUser('id') userId: string,
  ): Promise<DataExportRequest> {
    return this.account.requestDataExport(userId);
  }

  @Post('delete')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  deleteAccount(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<{ success: true; gracePeriodEndsAt: Date }> {
    const dto = DeleteAccountSchema.parse(body);
    return this.account.deleteAccount(userId, dto, req.ip);
  }
}
