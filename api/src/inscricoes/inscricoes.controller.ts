import { Controller, Get, Post, Body, Param, Delete, Query, Patch, ParseIntPipe } from '@nestjs/common';
import { InscricoesService } from './inscricoes.service';
import { CreateInscricaoDto } from './dto/create-inscricao.dto';
import { UpdateStatusInscricaoDto } from './dto/update-status-inscricao.dto';

import { CreatePagamentoDto } from './dto/create-pagamento.dto';

@Controller('inscricoes')
export class InscricoesController {
  constructor(private readonly inscricoesService: InscricoesService) {}

  @Post()
  criar(@Body() createInscricaoDto: CreateInscricaoDto) {
    return this.inscricoesService.criar(createInscricaoDto);
  }

  @Post(':id/pagamentos')
  adicionarPagamento(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPagamentoDto: CreatePagamentoDto
  ) {
    // Garante que o ID da inscrição no body é o mesmo da URL
    createPagamentoDto.inscricaoId = id;
    return this.inscricoesService.adicionarPagamento(createPagamentoDto);
  }

  @Get()
  buscarTodas(@Query('eventoId', new ParseIntPipe({ optional: true })) eventoId?: number) {
    return this.inscricoesService.buscarTodas(eventoId);
  }

  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.inscricoesService.remover(id);
  }

  @Patch(':id/status')
  atualizarStatus(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateStatusInscricaoDto) {
    return this.inscricoesService.atualizarStatus(id, updateDto.status);
  }
}
