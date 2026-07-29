import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { LancamentosExtratoService } from './lancamentos-extrato.service';
import { CreateLancamentoExtratoDto } from './dto/create-lancamento-extrato.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('lancamentos-extrato')
export class LancamentosExtratoController {
  constructor(private readonly service: LancamentosExtratoService) {}

  @Post('lote')
  criarLote(@Body() dtos: CreateLancamentoExtratoDto[]) {
    return this.service.criarLote(dtos);
  }

  @Get('conta/:contaId')
  buscarPorConta(@Param('contaId', ParseIntPipe) contaId: number) {
    return this.service.buscarPorConta(contaId);
  }
}
