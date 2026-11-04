import { Module } from '@nestjs/common';
import { ConciliacaoController } from './conciliacao.controller';
import { ConciliacaoService } from './conciliacao.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConciliacaoController],
  providers: [ConciliacaoService],
  exports: [ConciliacaoService],
})
export class ConciliacaoModule {}

