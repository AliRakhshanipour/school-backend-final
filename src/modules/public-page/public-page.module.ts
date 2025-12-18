// src/modules/public-page/public-page.module.ts
import { Module } from '@nestjs/common';
import { PublicPageService } from './public-page.service';
import { AdminPublicPageController } from './admin-public-page.controller';
import { PublicLandingController } from './public-landing.controller';

@Module({
  providers: [PublicPageService],
  controllers: [
    AdminPublicPageController,
    PublicLandingController,
  ],
  exports: [PublicPageService],
})
export class PublicPageModule {}
