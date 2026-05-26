import { Module } from '@nestjs/common';
import { ProdutosVendaService } from './produtos-venda.service';
import { ProdutosVendaController } from './produtos-venda.controller';

@Module({
  controllers: [ProdutosVendaController],
  providers: [ProdutosVendaService],
  exports: [ProdutosVendaService],
})
export class ProdutosVendaModule {}
