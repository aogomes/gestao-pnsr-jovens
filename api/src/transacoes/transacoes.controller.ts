import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { TransacoesService } from './transacoes.service';
import { CreateTransacaoDto } from './dto/create-transacao.dto';
import { UpdateTransacaoDto } from './dto/update-transacao.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';
import { RequirePermissions } from '../autenticacao/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('transacoes')
export class TransacoesController {
  constructor(private readonly transacoesService: TransacoesService) {}

  @Post()
  @RequirePermissions('transacoes', 'escrever')
  criar(@Body() createTransacaoDto: CreateTransacaoDto) {
    return this.transacoesService.criar(createTransacaoDto);
  }

  @Get()
  @RequirePermissions('transacoes', 'ler')
  buscarTodas() {
    return this.transacoesService.buscarTodas();
  }

  @Get('paginada')
  @RequirePermissions('transacoes', 'ler')
  buscarPaginada(@Query() query: any) {
    return this.transacoesService.buscarPaginada(query);
  }

  @Get(':id')
  @RequirePermissions('transacoes', 'ler')
  buscarUma(@Param('id', ParseIntPipe) id: number) {
    return this.transacoesService.buscarUma(id);
  }

  @Patch(':id')
  @RequirePermissions('transacoes', 'escrever')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() updateTransacaoDto: UpdateTransacaoDto) {
    return this.transacoesService.atualizar(id, updateTransacaoDto);
  }

  @Delete(':id')
  @RequirePermissions('transacoes', 'escrever')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.transacoesService.remover(id);
  }
}

