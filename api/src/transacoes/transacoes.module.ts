import { Module } from '@nestjs/common';
import { TransacoesController } from './transacoes.controller';
import { TransacoesService } from './transacoes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransacoesController],
  providers: [TransacoesService]
})
export class TransacoesModule {}

