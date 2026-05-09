import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OffersService, type MyOffer, type OfferRow } from './offers.service';
import { CreateOfferSchema } from './dto/create-offer.dto';

@Controller('offers')
export class OffersController {
  constructor(private offers: OffersService) {}

  @Get('me/list')
  myOffers(@CurrentUser('id') userId: string): Promise<MyOffer[]> {
    return this.offers.getMyOffers(userId);
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<OfferRow> {
    const dto = CreateOfferSchema.parse(body);
    return this.offers.createOffer(userId, dto);
  }

  @Patch(':id/withdraw')
  withdraw(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<OfferRow> {
    return this.offers.withdrawOffer(userId, id);
  }
}
