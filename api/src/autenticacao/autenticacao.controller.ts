import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AutenticacaoService } from './autenticacao.service';
import { RegistrarDto } from './dto/registrar.dto';

@Controller('autenticacao')
export class AutenticacaoController {
  constructor(private readonly autenticacaoService: AutenticacaoService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: { login: string; senha: string }) {
    return this.autenticacaoService.login(body.login, body.senha);
  }

  @Post('registrar')
  async registrar(@Body() registrarDto: RegistrarDto) {
    return this.autenticacaoService.registrar(registrarDto);
  }
}

