import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  CreateReviewSchema,
  RespondToReviewSchema,
} from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.CREATED)
  createReview(@CurrentUser('id') userId: string, @Body() body: unknown) {
    const dto = CreateReviewSchema.parse(body);
    return this.reviews.createReview(userId, dto);
  }

  @Patch(':id/respond')
  respond(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const dto = RespondToReviewSchema.parse(body);
    return this.reviews.respondToReview(userId, id, dto);
  }

  @Public()
  @Get('user/:userId')
  getReviewsForUser(
    @Param('userId') userId: string,
    @Query('direction') direction?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviews.getReviewsForUser(
      userId,
      direction === 'SELLER_REVIEWS_BUYER'
        ? 'SELLER_REVIEWS_BUYER'
        : 'BUYER_REVIEWS_SELLER',
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('order/:orderId/eligibility')
  canReview(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviews.canReviewOrder(userId, orderId);
  }
}
