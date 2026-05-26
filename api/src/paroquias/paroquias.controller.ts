import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ParoquiasService } from './paroquias.service';
import { CreateParoquiaDto } from './dto/create-paroquia.dto';
import { UpdateParoquiaDto } from './dto/update-paroquia.dto';

@Controller('paroquias')
export class ParoquiasController {
  constructor(private readonly paroquiasService: ParoquiasService) {}

  @Post()
  criar(@Body() createParoquiaDto: CreateParoquiaDto) {
    return this.paroquiasService.criar(createParoquiaDto);
  }

  @Get()
  buscarTodas() {
    return this.paroquiasService.buscarTodas();
  }

  @Get(':id')
  buscarUma(@Param('id', ParseIntPipe) id: number) {
    return this.paroquiasService.buscarUma(id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() updateParoquiaDto: UpdateParoquiaDto) {
    return this.paroquiasService.atualizar(id, updateParoquiaDto);
  }

  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.paroquiasService.remover(id);
  }
}

