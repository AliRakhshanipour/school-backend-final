import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PreRegistrationService } from './preregistration.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePreRegistrationDto } from './dto/create-preregistration.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CheckStatusDto } from './dto/check-status.dto';
import type { Express } from 'express';
import { memoryStorage } from 'multer';

@ApiTags('public-preregistration')
@Controller('public/preregistration')
export class PublicPreRegistrationController {
  constructor(private readonly preRegistrationService: PreRegistrationService) {}

  @Get('window')
  @ApiOperation({ summary: 'وضعیت باز/بسته بودن فرم پیش‌ثبت‌نام' })
  async getWindow() {
    return this.preRegistrationService.getActiveWindow();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 200 * 1024 }, // 200KB
      fileFilter: (req, file, cb) => {
        const ok = ['image/jpeg', 'image/png'].includes(file.mimetype);
        if (!ok) {
          return cb(
            new BadRequestException('فرمت فایل عکس باید jpg یا png باشد'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'ایجاد پیش‌ثبت‌نام جدید از صفحه عمومی (با آپلود عکس)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description:
            'JSON شامل اطلاعات هنرجو و والدین مطابق CreatePreRegistrationDto',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'عکس ۳x۴ هنرجو (حداکثر ۲۰۰KB، jpg/png)',
        },
      },
      required: ['data'],
    },
  })
  async create(
    @Body('data') rawData: string,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    if (!rawData) {
      throw new BadRequestException('فیلد data (JSON) الزامی است');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      throw new BadRequestException('ساختار JSON ارسال‌شده نامعتبر است');
    }

    const dto = plainToInstance(CreatePreRegistrationDto, parsed);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.preRegistrationService.createPublicPreRegistration(dto, photo);
  }

  @Post('status')
  @ApiOperation({
    summary: 'چک وضعیت پیش‌ثبت‌نام با کد ملی و شماره تماس',
  })
  async checkStatus(@Body() dto: CheckStatusDto) {
    return this.preRegistrationService.checkStatus(dto);
  }
}
