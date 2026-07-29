import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VendasService } from './vendas.service';
import { CreateVendaDto } from './dto/create-venda.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';
import { RequirePermissions } from '../autenticacao/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vendas')
export class VendasController {
  constructor(private readonly service: VendasService) {}

  @Post()
  @RequirePermissions('vendas', 'escrever')
  create(@Body() dto: CreateVendaDto) {
    return this.service.create(dto);
  }

  @Post('trabalho/:trabalhoId/produtos')
  @RequirePermissions('vendas', 'escrever')
  configurarProdutos(@Param('trabalhoId') trabalhoId: string, @Body() dto: { produtosIds: number[] }) {
    return this.service.configurarProdutos(+trabalhoId, dto.produtosIds);
  }

  @Get('trabalho/:trabalhoId/produtos')
  @RequirePermissions('vendas', 'ler')
  obterProdutosConfigurados(@Param('trabalhoId') trabalhoId: string) {
    return this.service.obterProdutosConfigurados(+trabalhoId);
  }

  @Get('trabalho/:trabalhoId')
  @RequirePermissions('vendas', 'ler')
  findByTrabalho(@Param('trabalhoId') trabalhoId: string) {
    return this.service.findByTrabalho(+trabalhoId);
  }

  @Post('trabalho/:trabalhoId/fechar')
  @RequirePermissions('vendas', 'escrever')
  fecharTurno(@Param('trabalhoId') trabalhoId: string) {
    return this.service.fecharTurno(+trabalhoId);
  }

  @Patch(':id')
  @RequirePermissions('vendas', 'escrever')
  update(@Param('id') id: string, @Body() dto: CreateVendaDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vendas', 'escrever')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
