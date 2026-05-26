import { Module } from '@nestjs/common';
import { InscricoesController } from './inscricoes.controller';
import { InscricoesService } from './inscricoes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InscricoesController],
  providers: [InscricoesService],
})
export class InscricoesModule {}

