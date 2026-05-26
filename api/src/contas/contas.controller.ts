import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Query } from '@nestjs/common';
import { ContasService } from './contas.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('contas')
export class ContasController {
  constructor(private readonly contasService: ContasService) {}

  @Post()
  criar(@Body() createContaDto: CreateContaDto) {
    return this.contasService.criar(createContaDto);
  }

  @Get()
  listar(@Request() req, @Query('paroquiaId', new ParseIntPipe({ optional: true })) paroquiaId?: number) {
    if (req.user.papel === 'ADMIN') {
      return this.contasService.listarTodas();
    }
    return this.contasService.listarPorParoquia(paroquiaId || req.user.paroquiaId);
  }

  @Get(':id')
  buscarUma(@Param('id', ParseIntPipe) id: number) {
    return this.contasService.buscarUma(id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.contasService.atualizar(id, dto);
  }

  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.contasService.remover(id);
  }
}
