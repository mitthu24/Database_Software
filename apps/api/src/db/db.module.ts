import { Global, Module } from '@nestjs/common';
import { drizzleProvider } from './db.provider';

// @Global so every feature module can @Inject(DRIZZLE_DB) without each one
// re-importing this module.
@Global()
@Module({
  providers: [drizzleProvider],
  exports: [drizzleProvider],
})
export class DbModule {}
