import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegistrarDto } from './dto/registrar.dto';

@Injectable()
export class AutenticacaoService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

        await tx.usuario.create({
          data: {
            login,
            senha: senhaCriptografada,
            papel: 'USUARIO',
            pessoaId,
          },
        });
      });
      console.log('Transação concluída com sucesso');
    } catch (error) {
      console.error('Erro na transação de registro:', error);
      throw error;
    }

    return this.login(login, senha);
  }
}

