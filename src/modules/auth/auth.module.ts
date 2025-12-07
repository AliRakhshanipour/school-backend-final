// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
        useFactory: (configService: ConfigService): JwtModuleOptions => {
                const expiresIn =
                configService.get<JwtSignOptions['expiresIn']>(
                    'jwt.accessExpiresIn',
                ) ?? '15m';

                return {
                secret: configService.get<string>('jwt.accessSecret'),
                signOptions: {
                    expiresIn,
                },
                };
            },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
