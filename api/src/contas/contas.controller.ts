import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, Query } from '@nestjs/common';
import { ContasService } from './contas.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';
import { RequirePermissions } from '../autenticacao/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contas')
export class ContasController {
  constructor(private readonly contasService: ContasService) {}

  @Post()
  @RequirePermissions('contas', 'escrever')
  criar(@Body() createContaDto: CreateContaDto) {
    return this.contasService.criar(createContaDto);
  }

  @Get()
  @RequirePermissions('contas', 'ler')
  listar(@Request() req, @Query('paroquiaId', new ParseIntPipe({ optional: true })) paroquiaId?: number) {
    if (req.user.papel === 'ADMIN') {
      return this.contasService.listarTodas();
    }
    return this.contasService.listarPorParoquia(paroquiaId || req.user.paroquiaId);
  }

  @Get(':id')
  @RequirePermissions('contas', 'ler')
  buscarUma(@Param('id', ParseIntPipe) id: number) {
    return this.contasService.buscarUma(id);
  }

  @Patch(':id')
  @RequirePermissions('contas', 'escrever')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.contasService.atualizar(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('contas', 'escrever')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.contasService.remover(id);
  }
}
