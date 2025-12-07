import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FieldOfStudyService } from './field-of-study.service';

@ApiTags('public-fields-of-study')
@Controller('public/fields-of-study')
export class PublicFieldOfStudyController {
  constructor(
    private readonly fieldOfStudyService: FieldOfStudyService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'لیست رشته‌های فعال (برای نمایش در لندینگ و فرم پیش‌ثبت‌نام)',
  })
  async findAllPublic() {
    return this.fieldOfStudyService.findAllPublic();
  }
}
