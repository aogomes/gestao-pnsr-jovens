import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { SaquesService } from './saques.service';
import { CreateSaqueDto } from './dto/create-saque.dto';

@Controller('saques')
export class SaquesController {
  constructor(private readonly saquesService: SaquesService) {}

  @Post()
  criar(@Body() createSaqueDto: CreateSaqueDto) {
    return this.saquesService.criar(createSaqueDto);
  }

  @Get('pessoa/:pessoaId')
  buscarPorPessoa(@Param('pessoaId') pessoaId: string) {
    return this.saquesService.buscarPorPessoa(Number(pessoaId));
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.saquesService.remover(Number(id));
  }
}
