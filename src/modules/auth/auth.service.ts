// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User } from '@prisma/client';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  /**
   * طول عمر refresh token به صورت رشته (مثلاً "7d" یا "1d" یا "12h")
   * این مقدار را خودمان هندل می‌کنیم، ربطی به JwtModule ندارد.
   */
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';
  }

  // -------------------- Helpers --------------------

  private async validateUser(
    username: string,
    password: string,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور اشتباه است');
    }

    const passwordValid = await argon2.verify(user.password, password);
    if (!passwordValid) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور اشتباه است');
    }

    return user;
  }

  /**
   * تولید access token بر اساس تنظیمات JwtModule (secret, expiresIn)
   */
  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    // ❗ نیازی به ارسال options اینجا نیست؛ JwtModule در AuthModule تنظیم شده.
    return this.jwtService.signAsync(payload);
  }

  /**
   * محاسبه تاریخ انقضای refresh token بر اساس رشته‌ای مانند "7d", "12h", "30m"
   */
  private getRefreshTokenExpiryDate(): Date {
    const now = new Date();
    const configValue = this.refreshExpiresIn;

    const match = configValue.match(/^(\d+)([dhm])$/); // days, hours, minutes
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      if (unit === 'd') {
        now.setDate(now.getDate() + value);
      } else if (unit === 'h') {
        now.setHours(now.getHours() + value);
      } else if (unit === 'm') {
        now.setMinutes(now.getMinutes() + value);
      }

      return now;
    }

    // اگر فرمت ناشناخته بود، fallback: 7 روز
    now.setDate(now.getDate() + 7);
    return now;
  }

  /**
   * تولید یک refresh token رندوم، هش‌کردن آن و ذخیره در User
   */
  private async generateAndStoreRefreshToken(user: User): Promise<string> {
    const rawToken = randomBytes(32).toString('hex'); // توکن خام که به کاربر می‌دهیم

    const hashed = await argon2.hash(rawToken);
    const expiresAt = this.getRefreshTokenExpiryDate();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        hashedRefreshToken: hashed,
        refreshTokenExpiresAt: expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * ساخت پاسخ استاندارد Auth شامل توکن‌ها و اطلاعات کاربر
   */
  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateAndStoreRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  // -------------------- Public API methods --------------------

  /**
   * لاگین کاربر با username/password
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(dto.username, dto.password);
    return this.buildAuthResponse(user);
  }

  /**
   * دریافت توکن‌های جدید با استفاده از accessToken فعلی (برای گرفتن userId)
   * و refreshToken ارسال‌شده در body
   */
  async refreshTokens(
    userId: string,
    dto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    if (!dto.refreshToken) {
      throw new BadRequestException('Refresh token الزامی است');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRefreshToken || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token نامعتبر است');
    }

    // چک انقضای refresh token
    if (user.refreshTokenExpiresAt < new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          hashedRefreshToken: null,
          refreshTokenExpiresAt: null,
        },
      });
      throw new UnauthorizedException('Refresh token منقضی شده است');
    }

    const matches = await argon2.verify(
      user.hashedRefreshToken,
      dto.refreshToken,
    );
    if (!matches) {
      throw new UnauthorizedException('Refresh token نامعتبر است');
    }

    // Rotate: توکن قبلی را با توکن جدید جایگزین می‌کنیم
    return this.buildAuthResponse(user);
  }

  /**
   * خروج کاربر: پاک کردن refresh token از دیتابیس
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hashedRefreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });
  }
}
