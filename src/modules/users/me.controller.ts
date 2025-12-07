// src/modules/users/me.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';

class MeResponseExample {
  id: string;
  username: string;
  role: string;
  profileType: string;
  // بقیه فیلدها به صورت دینامیک بر اساس نقش اضافه می‌شن
}

@ApiTags('me')
@ApiBearerAuth('access-token')
@Controller('me')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'گرفتن پروفایل کاربر فعلی' })
  @ApiOkResponse({ type: MeResponseExample })
  async getMe(@GetUser('userId') userId: string) {
    return this.usersService.getMe(userId);
  }
}
