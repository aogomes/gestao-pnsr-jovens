import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { PessoasService } from './pessoas.service';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';
import { RequirePermissions } from '../autenticacao/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pessoas')
export class PessoasController {
  constructor(private readonly pessoasService: PessoasService) {}

  @Post()
  @RequirePermissions('pessoas', 'escrever')
  criar(@Body() createPessoaDto: CreatePessoaDto, @Request() req) {
    return this.pessoasService.criar(createPessoaDto, req.user);
  }

  @Get()
  @RequirePermissions('pessoas', 'ler')
  buscarTodas(@Request() req) {
    return this.pessoasService.buscarTodas(req.user);
  }

  @Get('perfil/me')
  buscarMeuPerfil(@Request() req) {
    const identificador = req.user.pessoaId || req.user.login;
    return this.pessoasService.buscarMeuPerfil(identificador);
  }

  @Get(':id')
  @RequirePermissions('pessoas', 'ler')
  buscarUma(@Param('id', ParseIntPipe) id: number) {
    return this.pessoasService.buscarUma(id);
  }

  @Patch(':id')
  @RequirePermissions('pessoas', 'escrever')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() updatePessoaDto: UpdatePessoaDto) {
    return this.pessoasService.atualizar(id, updatePessoaDto);
  }

  @Delete(':id')
  @RequirePermissions('pessoas', 'escrever')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.pessoasService.remover(id);
  }
}

