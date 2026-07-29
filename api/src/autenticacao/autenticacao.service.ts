import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { RegistrarDto } from './dto/registrar.dto';

@Injectable()
export class AutenticacaoService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async login(login: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { login },
      include: { pessoa: true },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!usuario.emailConfirmado) {
      throw new ForbiddenException('EMAIL_NAO_CONFIRMADO');
    }

    const pessoa = usuario.pessoa;
    const payload = { 
      sub: usuario.id, 
      login: usuario.login, 
      papel: usuario.papel, 
      pessoaId: usuario.pessoaId,
      paroquiaId: pessoa?.paroquiaId 
    };
    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: pessoa?.nome || 'Sem Nome',
        login: usuario.login,
        papel: usuario.papel,
        pessoaId: usuario.pessoaId,
      },
    };
  }

  async registrar(dados: RegistrarDto) {
    const { nome, login, senha, confirmarSenha, paroquiaId, comunidade } = dados;

    if (senha !== confirmarSenha) {
      throw new BadRequestException('As senhas não conferem');
    }

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { login },
    });

    if (usuarioExistente) {
      throw new ConflictException('Este e-mail já possui cadastro completo no sistema.');
    }

    const pessoaExistente = await this.prisma.pessoa.findUnique({
      where: { email: login },
    });

    const salt = await bcrypt.genSalt();
    const senhaCriptografada = await bcrypt.hash(senha, salt);

    console.log('Iniciando transação de registro para:', login);
    try {
      await this.prisma.$transaction(async (tx) => {
        let pessoaId: number;

        if (pessoaExistente) {
          pessoaId = pessoaExistente.id;
          if (paroquiaId || comunidade) {
            await tx.pessoa.update({
              where: { id: pessoaId },
              data: {
                ...(paroquiaId && { paroquiaId }),
                ...(comunidade && { comunidade }),
              },
            });
          }
        } else {
          const pessoa = await tx.pessoa.create({
            data: {
              nome,
              email: login,
              ...(paroquiaId && { paroquiaId }),
              ...(comunidade && { comunidade }),
            },
          });
          pessoaId = pessoa.id;
        }

        const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();
        const codigoVerificacaoExpira = new Date(Date.now() + 15 * 60000); // 15 minutos

        await tx.usuario.create({
          data: {
            login,
            senha: senhaCriptografada,
            papel: 'USUARIO',
            pessoaId,
            codigoVerificacao,
            codigoVerificacaoExpira,
          },
        });

        // Envia o e-mail de verificação (pode ser executado assincronamente)
        this.mailService.sendVerificationCode(login, codigoVerificacao, nome);
        
        // Log para testes locais:
        console.log(`[TESTE LOCAL] Código de verificação para ${login}: ${codigoVerificacao}`);
      });
      console.log('Transação concluída com sucesso');
    } catch (error) {
      console.error('Erro na transação de registro:', error);
      throw error;
    }

    return {
      message: 'Cadastro realizado com sucesso. Verifique seu e-mail para ativar a conta.',
    };
  }

  async verificarEmail(login: string, codigo: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { login },
      include: { pessoa: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (usuario.emailConfirmado) {
      throw new BadRequestException('E-mail já está confirmado');
    }

    if (usuario.codigoVerificacao !== codigo) {
      throw new BadRequestException('Código inválido');
    }

    if (!usuario.codigoVerificacaoExpira || new Date() > usuario.codigoVerificacaoExpira) {
      throw new BadRequestException('Código expirado');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        emailConfirmado: true,
        codigoVerificacao: null,
        codigoVerificacaoExpira: null,
      },
    });

    // Retorna o token para logar automaticamente
    const pessoa = usuario.pessoa;
    const payload = { 
      sub: usuario.id, 
      login: usuario.login, 
      papel: usuario.papel, 
      pessoaId: usuario.pessoaId,
      paroquiaId: pessoa?.paroquiaId 
    };
    return {
      message: 'E-mail confirmado com sucesso!',
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: pessoa?.nome || 'Sem Nome',
        login: usuario.login,
        papel: usuario.papel,
        pessoaId: usuario.pessoaId,
      },
    };
  }

  async reenviarCodigo(login: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { login },
      include: { pessoa: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (usuario.emailConfirmado) {
      throw new BadRequestException('E-mail já está confirmado');
    }

    const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();
    const codigoVerificacaoExpira = new Date(Date.now() + 15 * 60000);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        codigoVerificacao,
        codigoVerificacaoExpira,
      },
    });

    await this.mailService.sendVerificationCode(login, codigoVerificacao, usuario.pessoa?.nome || 'Usuário');

    // Log para testes locais:
    console.log(`[TESTE LOCAL] Novo código reenviado para ${login}: ${codigoVerificacao}`);

    return { message: 'Novo código enviado com sucesso' };
  }
}

