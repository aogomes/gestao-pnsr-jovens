import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { PessoasService } from './pessoas.service';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('pessoas')
export class PessoasController {
  constructor(private readonly pessoasService: PessoasService) {}

  @Post()
  criar(@Body() createPessoaDto: CreatePessoaDto, @Request() req) {
    return this.pessoasService.criar(createPessoaDto, req.user);
  }

  @Get()
  buscarTodas(@Request() req) {
    return this.pessoasService.buscarTodas(req.user);
  }

  @Get('perfil/me')
  buscarMeuPerfil(@Request() req) {
    const identificador = req.user.pessoaId || req.user.login;
    return this.pessoasService.buscarMeuPerfil(identificador);
  }

  @Get(':id')
  buscarUma(@Param('id', ParseIntPipe) id: number) {
    return this.pessoasService.buscarUma(id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() updatePessoaDto: UpdatePessoaDto) {
    return this.pessoasService.atualizar(id, updatePessoaDto);
  }

  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.pessoasService.remover(id);
  }
}

