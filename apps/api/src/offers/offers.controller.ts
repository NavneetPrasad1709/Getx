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
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  OffersService,
  type MyOffer,
  type OfferRow,
  type PublicOffer,
} from './offers.service';
import { CreateOfferSchema } from './dto/create-offer.dto';

@Controller('offers')
export class OffersController {
  constructor(private offers: OffersService) {}

  @Get('me/list')
  myOffers(@CurrentUser('id') userId: string): Promise<MyOffer[]> {
    return this.offers.getMyOffers(userId);
  }

  /* Public share endpoint — backs the /o/[offerId] viewer + the OG card.
     Throttled to keep enum-scrape probes off the DB; per-IP not per-user
     because the route itself is public. */
  @Public()
  @Get(':id/public')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  publicView(@Param('id') id: string): Promise<PublicOffer> {
    return this.offers.getPublicOffer(id);
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
