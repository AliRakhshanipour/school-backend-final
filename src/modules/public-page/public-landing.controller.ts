import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicPageService } from './public-page.service';

@ApiTags('public-landing')
@Controller('public')
export class PublicLandingController {
  constructor(private readonly publicPageService: PublicPageService) {}

  @Get('sections')
  @ApiOperation({ summary: 'لیست بخش‌های فعال صفحه عمومی (برای لندینگ)' })
  listSections() {
    return this.publicPageService.publicListSections();
  }

  @Get('sections/:key')
  @ApiOperation({ summary: 'دریافت یک بخش فعال صفحه عمومی بر اساس sectionKey' })
  getSection(@Param('key') key: string) {
    return this.publicPageService.publicGetSectionByKey(key);
  }

  @Get('landing')
  @ApiOperation({
    summary: 'دیتای کامل لندینگ: سکشن‌ها + چند خبر عمومی + وضعیت پیش‌ثبت‌نام',
  })
  landing() {
    return this.publicPageService.landingData();
  }
}
