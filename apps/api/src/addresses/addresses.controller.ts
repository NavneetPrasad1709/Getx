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
import type { Address } from '@getx/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireOwnership } from '../auth/decorators/require-ownership.decorator';
import { AddressesService } from './addresses.service';
import { CreateAddressSchema, UpdateAddressSchema } from './dto/address.dto';

@Controller('addresses')
export class AddressesController {
  constructor(private svc: AddressesService) {}

  @Get()
  list(@CurrentUser('id') userId: string): Promise<Address[]> {
    return this.svc.listMine(userId);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<Address> {
    const dto = CreateAddressSchema.parse(body);
    return this.svc.create(userId, dto);
  }

  @Patch(':id')
  @RequireOwnership('address')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<Address> {
    const dto = UpdateAddressSchema.parse(body);
    return this.svc.update(userId, id, dto);
  }

  @Delete(':id')
  @RequireOwnership('address')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    return this.svc.remove(userId, id);
  }
}
