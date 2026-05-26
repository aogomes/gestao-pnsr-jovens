import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { TransacoesService } from './transacoes.service';
import { CreateTransacaoDto } from './dto/create-transacao.dto';
import { UpdateTransacaoDto } from './dto/update-transacao.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('transacoes')
export class TransacoesController {
  constructor(private readonly transacoesService: TransacoesService) {}

  @Post()
  criar(@Body() createTransacaoDto: CreateTransacaoDto) {
    return this.transacoesService.criar(createTransacaoDto);
  }

  @Get()
  buscarTodas() {
    return this.transacoesService.buscarTodas();
  }

  @Get(':id')
  buscarUma(@Param('id', ParseIntPipe) id: number) {
    return this.transacoesService.buscarUma(id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() updateTransacaoDto: UpdateTransacaoDto) {
    return this.transacoesService.atualizar(id, updateTransacaoDto);
  }

  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.transacoesService.remover(id);
  }
}

