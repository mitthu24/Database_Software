import { Module } from '@nestjs/common';
import { PlatformAdminsService } from './platform-admins.service';

@Module({
  providers: [PlatformAdminsService],
  exports: [PlatformAdminsService],
})
export class PlatformAdminsModule {}
