import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Post()
  criar(@Body() createEventoDto: CreateEventoDto) {
    return this.eventosService.criar(createEventoDto);
  }

  @Get()
  buscarTodos() {
    return this.eventosService.buscarTodos();
  }

  @Get(':id')
  buscarUm(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.buscarUm(id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() updateEventoDto: UpdateEventoDto) {
    return this.eventosService.atualizar(id, updateEventoDto);
  }

  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.remover(id);
  }

  @Get(':id/membros-despesas')
  buscarDespesasMembros(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.buscarDespesasMembros(id);
  }
}

