import { Module } from '@nestjs/common';
import { PreRegistrationService } from './preregistration.service';
import { PublicPreRegistrationController } from './public-preregistration.controller';
import { AdminPreRegistrationController } from './admin-preregistration.controller';

@Module({
  controllers: [
    PublicPreRegistrationController,
    AdminPreRegistrationController,
  ],
  providers: [PreRegistrationService],
  exports: [PreRegistrationService],
})
export class PreRegistrationModule {}
