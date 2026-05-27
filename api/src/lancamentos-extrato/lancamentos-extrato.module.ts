import { Module } from '@nestjs/common';
import { LancamentosExtratoService } from './lancamentos-extrato.service';
import { LancamentosExtratoController } from './lancamentos-extrato.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LancamentosExtratoController],
  providers: [LancamentosExtratoService],
  exports: [LancamentosExtratoService]
})
export class LancamentosExtratoModule {}
