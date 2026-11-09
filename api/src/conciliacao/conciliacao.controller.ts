import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ConciliacaoService } from './conciliacao.service';
import {
  CreateConciliacaoDto,
  CreateConciliacaoItemDto,
} from './dto/create-conciliacao.dto';
import { UpdateConciliacaoDto } from './dto/update-conciliacao.dto';
import { AssociarPessoaDto } from './dto/associar-pessoa.dto';
import { RatearConciliacaoDto } from './dto/ratear-conciliacao.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';
import { RequirePermissions } from '../autenticacao/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('conciliacao')
export class ConciliacaoController {
  constructor(private readonly service: ConciliacaoService) {}

  @Post()
  @RequirePermissions('contas', 'escrever')
  criar(@Body() dto: CreateConciliacaoDto) {
    return this.service.criar(dto);
  }

  @Get()
  @RequirePermissions('contas', 'ler')
  listarTodas(
    @Query('mes') mes?: string,
    @Query('ano') ano?: string,
    @Query('contaId') contaId?: string,
  ) {
    return this.service.listarTodas({
      mes: mes ? Number(mes) : undefined,
      ano: ano ? Number(ano) : undefined,
      contaId: contaId ? Number(contaId) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('contas', 'ler')
  buscarUma(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarUma(id);
  }

  @Patch(':id')
  @RequirePermissions('contas', 'escrever')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConciliacaoDto,
  ) {
    return this.service.atualizar(id, dto);
  }

  @Post(':id/itens')
  @RequirePermissions('contas', 'escrever')
  adicionarItens(
    @Param('id', ParseIntPipe) id: number,
    @Body() itens: CreateConciliacaoItemDto[],
  ) {
    return this.service.adicionarItens(id, itens);
  }

  @Post(':id/ratear')
  @RequirePermissions('contas', 'escrever')
  ratear(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RatearConciliacaoDto,
  ) {
    return this.service.ratear(id, dto);
  }

  @Post(':id/estornar-rateio')
  @RequirePermissions('contas', 'escrever')
  estornarRateio(@Param('id', ParseIntPipe) id: number) {
    return this.service.estornarRateio(id);
  }

  @Patch('itens/:itemId/pessoa')
  @RequirePermissions('contas', 'escrever')
  associarPessoaItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: AssociarPessoaDto,
  ) {
    return this.service.associarPessoaItem(itemId, dto);
  }

  @Delete('itens/:itemId')
  @RequirePermissions('contas', 'escrever')
  removerItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.service.removerItem(itemId);
  }

  @Delete(':id')
  @RequirePermissions('contas', 'escrever')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.remover(id);
  }
}
