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
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ListingsService,
  type ListListingsResponse,
  type ListingDetail,
  type RelatedListing,
  type MyListingItem,
  type MyListingDetail,
  type SellerListingRow,
} from './listings.service';
import { ListListingsSchema } from './dto/list-listings.dto';
import {
  CreateListingSchema,
  UpdateListingSchema,
} from './dto/create-listing.dto';

@Controller('listings')
export class ListingsController {
  constructor(private listings: ListingsService) {}

  // 60/min per IP — high enough that a normal browser session never
  // trips it (paging + search refresh easily stays under one per second)
  // but low enough that a scraper hammering the index page from a single
  // host gets a 429 before it drains Neon connections.
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  listListings(@Query() query: unknown): Promise<ListListingsResponse> {
    const dto = ListListingsSchema.parse(query);
    return this.listings.listListings(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/list')
  getMyListings(@CurrentUser('id') userId: string): Promise<MyListingItem[]> {
    return this.listings.getMyListings(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/:id')
  getMyListing(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<MyListingDetail> {
    return this.listings.getMyListing(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.CREATED)
  createListing(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ): Promise<SellerListingRow> {
    const dto = CreateListingSchema.parse(body);
    return this.listings.createListing(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateListing(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SellerListingRow> {
    const dto = UpdateListingSchema.parse(body);
    return this.listings.updateListing(userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteListing(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.listings.deleteListing(userId, id);
  }

  @Public()
  @Get(':slug')
  getListing(@Param('slug') slug: string): Promise<ListingDetail> {
    return this.listings.getListingBySlug(slug);
  }

  @Public()
  @Get(':slug/related')
  async getRelated(@Param('slug') slug: string): Promise<RelatedListing[]> {
    const listing = await this.listings.getListingBySlug(slug);
    return this.listings.getRelatedListings(listing.id, 6);
  }
}
