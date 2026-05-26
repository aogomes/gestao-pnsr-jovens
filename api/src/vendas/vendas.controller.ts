import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VendasService } from './vendas.service';
import { CreateVendaDto } from './dto/create-venda.dto';

@Controller('vendas')
export class VendasController {
  constructor(private readonly service: VendasService) {}

  @Post()
  create(@Body() dto: CreateVendaDto) {
    return this.service.create(dto);
  }

  @Post('trabalho/:trabalhoId/produtos')
  configurarProdutos(@Param('trabalhoId') trabalhoId: string, @Body() dto: { produtosIds: number[] }) {
    return this.service.configurarProdutos(+trabalhoId, dto.produtosIds);
  }

  @Get('trabalho/:trabalhoId/produtos')
  obterProdutosConfigurados(@Param('trabalhoId') trabalhoId: string) {
    return this.service.obterProdutosConfigurados(+trabalhoId);
  }

  @Get('trabalho/:trabalhoId')
  findByTrabalho(@Param('trabalhoId') trabalhoId: string) {
    return this.service.findByTrabalho(+trabalhoId);
  }

  @Post('trabalho/:trabalhoId/fechar')
  fecharTurno(@Param('trabalhoId') trabalhoId: string) {
    return this.service.fecharTurno(+trabalhoId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreateVendaDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
