import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query, Delete, ParseIntPipe } from '@nestjs/common';
import { RifasService } from './rifas.service';
import { CreateRifaDto } from './dto/create-rifa.dto';
import { AlocarRifaDto } from './dto/alocar-rifa.dto';
import { UpdateBilheteDto } from './dto/update-bilhete.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';
import { RequirePermissions } from '../autenticacao/permissions.decorator';
import { UpdateBilheteBulkDto } from './dto/update-bilhete-bulk.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rifas')
export class RifasController {
  constructor(private readonly rifasService: RifasService) {}

  // 1. ROTAS ESTÁTICAS E DE CRIAÇÃO
  @Post()
  @RequirePermissions('rifas', 'escrever')
  criar(@Body() createRifaDto: CreateRifaDto, @Request() req) {
    return this.rifasService.criar(createRifaDto, req.user);
  }

  @Get()
  @RequirePermissions('rifas', 'ler')
  listarTodas(@Request() req) {
    return this.rifasService.listarTodas(req.user);
  }

  @Get('ativas')
  // Permite acesso geral (sem restrição de módulo) para verificar rifas ativas na montagem do menu ou tela de listagem básica
  listarAtivas(@Request() req) {
    return this.rifasService.listarAtivas(req.user);
  }

  @Post('alocar')
  @RequirePermissions('rifas', 'escrever')
  alocarCartela(@Body() alocarRifaDto: AlocarRifaDto) {
    return this.rifasService.alocarCartela(alocarRifaDto);
  }

  @Patch('bilhetes/bulk')
  @RequirePermissions('rifas', 'escrever')
  atualizarBilhetesEmLote(@Body() updateBilheteBulkDto: UpdateBilheteBulkDto, @Request() req) {
    const pessoaId = req.user.pessoaId;
    return this.rifasService.atualizarBilhetesEmLote(updateBilheteBulkDto, pessoaId);
  }

  @Post(':id/ratear')
  @RequirePermissions('rifas', 'escrever')
  ratearArrecadacao(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.rifasService.ratearArrecadacao(id, req.user);
  }

  // 2. ROTAS DE SUB-RECURSOS (COM PREFIXOS OU SUFIXOS)
  @Get(':id/resumo')
  @RequirePermissions('rifas', 'ler')
  obterResumo(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.rifasService.obterResumo(id, req.user);
  }

  @Get(':id/meus-bilhetes')
  @RequirePermissions('rifas', 'ler')
  listarMeusBilhetes(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const pessoaId = req.user.pessoaId;
    return this.rifasService.listarMeusBilhetes(id, pessoaId);
  }

  @Patch('bilhetes/:id')
  @RequirePermissions('rifas', 'escrever')
  atualizarBilhete(@Param('id', ParseIntPipe) id: number, @Body() updateBilheteDto: UpdateBilheteDto, @Request() req) {
    const pessoaId = req.user.pessoaId;
    return this.rifasService.atualizarBilhete(id, updateBilheteDto, pessoaId);
  }

  // 3. ROTAS DE PARÂMETRO GENÉRICO (POR ÚLTIMO)
  @Get(':id')
  @RequirePermissions('rifas', 'ler')
  buscarUma(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.rifasService.buscarUma(id, req.user);
  }

  @Patch(':id')
  @RequirePermissions('rifas', 'escrever')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.rifasService.atualizar(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('rifas', 'escrever')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.rifasService.remover(id);
  }

  @Delete('all/limpar-tudo')
  @RequirePermissions('rifas', 'escrever')
  limparTudo() {
    return this.rifasService.limparTudo();
  }
}
