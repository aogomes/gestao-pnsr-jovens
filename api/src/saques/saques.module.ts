import { Module } from '@nestjs/common';
import { SaquesService } from './saques.service';
import { SaquesController } from './saques.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SaquesController],
  providers: [SaquesService],
  exports: [SaquesService],
})
export class SaquesModule {}
