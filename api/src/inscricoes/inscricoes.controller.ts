import { Controller, Get, Post, Body, Param, Delete, Query, Patch, ParseIntPipe, UseGuards } from '@nestjs/common';
import { InscricoesService } from './inscricoes.service';
import { CreateInscricaoDto } from './dto/create-inscricao.dto';
import { UpdateStatusInscricaoDto } from './dto/update-status-inscricao.dto';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';
import { RequirePermissions } from '../autenticacao/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inscricoes')
export class InscricoesController {
  constructor(private readonly inscricoesService: InscricoesService) {}

  @Post()
  @RequirePermissions('inscricoes', 'escrever')
  criar(@Body() createInscricaoDto: CreateInscricaoDto) {
    return this.inscricoesService.criar(createInscricaoDto);
  }

  @Post(':id/pagamentos')
  @RequirePermissions('inscricoes', 'escrever')
  adicionarPagamento(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPagamentoDto: CreatePagamentoDto
  ) {
    // Garante que o ID da inscrição no body é o mesmo da URL
    createPagamentoDto.inscricaoId = id;
    return this.inscricoesService.adicionarPagamento(createPagamentoDto);
  }

  @Get()
  @RequirePermissions('inscricoes', 'ler')
  buscarTodas(@Query('eventoId', new ParseIntPipe({ optional: true })) eventoId?: number) {
    return this.inscricoesService.buscarTodas(eventoId);
  }

  @Delete(':id')
  @RequirePermissions('inscricoes', 'escrever')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.inscricoesService.remover(id);
  }

  @Patch(':id/status')
  @RequirePermissions('inscricoes', 'escrever')
  atualizarStatus(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateStatusInscricaoDto) {
    return this.inscricoesService.atualizarStatus(id, updateDto.status);
  }

  @Post(':id/desistencia')
  @RequirePermissions('inscricoes', 'escrever')
  registrarDesistencia(@Param('id', ParseIntPipe) id: number, @Body() payload: { opcao: string, targetPessoaId?: number }) {
    return this.inscricoesService.registrarDesistencia(id, payload.opcao, payload.targetPessoaId);
  }
}
