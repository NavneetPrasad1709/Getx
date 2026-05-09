import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import {
  ListingsService,
  type ListListingsResponse,
  type ListingDetail,
  type RelatedListing,
} from './listings.service';
import { ListListingsSchema } from './dto/list-listings.dto';

@Controller('listings')
export class ListingsController {
  constructor(private listings: ListingsService) {}

  @Public()
  @Get()
  listListings(@Query() query: unknown): Promise<ListListingsResponse> {
    const dto = ListListingsSchema.parse(query);
    return this.listings.listListings(dto);
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
