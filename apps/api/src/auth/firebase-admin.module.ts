import { Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.provider';

@Module({
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class FirebaseAdminModule {}
