import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { PaymentMethod } from '@getx/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentMethodsService } from './payment-methods.service';
import {
  CreatePaymentMethodSchema,
  UpdatePaymentMethodSchema,
} from './dto/payment-method.dto';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private svc: PaymentMethodsService) {}

  @Get()
  list(@CurrentUser('id') userId: string): Promise<PaymentMethod[]> {
    return this.svc.listMine(userId);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<PaymentMethod> {
    const dto = CreatePaymentMethodSchema.parse(body);
    return this.svc.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<PaymentMethod> {
    const dto = UpdatePaymentMethodSchema.parse(body);
    return this.svc.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    return this.svc.remove(userId, id);
  }
}
