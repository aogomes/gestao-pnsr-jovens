import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';
import { RequirePermissions } from '../autenticacao/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Post()
  @RequirePermissions('eventos', 'escrever')
  criar(@Body() createEventoDto: CreateEventoDto) {
    return this.eventosService.criar(createEventoDto);
  }

  @Get()
  @RequirePermissions('eventos', 'ler')
  buscarTodos() {
    return this.eventosService.buscarTodos();
  }

  @Get('ativos')
  // Permite que qualquer usuário logado (ex: USUARIO) veja os eventos ativos no Meu Painel
  buscarAtivos() {
    return this.eventosService.buscarAtivos();
  }

  @Get(':id')
  @RequirePermissions('eventos', 'ler')
  buscarUm(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.buscarUm(id);
  }

  @Patch(':id')
  @RequirePermissions('eventos', 'escrever')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() updateEventoDto: UpdateEventoDto) {
    return this.eventosService.atualizar(id, updateEventoDto);
  }

  @Delete(':id')
  @RequirePermissions('eventos', 'escrever')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.remover(id);
  }

  @Get(':id/membros-despesas')
  @RequirePermissions('eventos', 'ler')
  buscarDespesasMembros(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.buscarDespesasMembros(id);
  }
}

