import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  criar(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.criar(createUsuarioDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  buscarTodos() {
    return this.usuariosService.buscarTodos();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  buscarUm(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.buscarUm(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.atualizar(id, updateUsuarioDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.remover(id);
  }
}

