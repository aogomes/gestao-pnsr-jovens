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

  @Post('verificar-email')
  async verificarEmail(@Body() body: { login: string; codigo: string }) {
    return this.autenticacaoService.verificarEmail(body.login, body.codigo);
  }

  @Post('reenviar-codigo')
  async reenviarCodigo(@Body() body: { login: string }) {
    return this.autenticacaoService.reenviarCodigo(body.login);
  }
}

