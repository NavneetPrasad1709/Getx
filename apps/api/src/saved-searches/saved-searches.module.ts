import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { SavedSearchesService } from './saved-searches.service';
import { SavedSearchesController } from './saved-searches.controller';

@Module({
  imports: [ListingsModule, MailModule, UsersModule],
  providers: [SavedSearchesService],
  controllers: [SavedSearchesController],
  exports: [SavedSearchesService],
})
export class SavedSearchesModule {}
