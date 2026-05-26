import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(createUsuarioDto: CreateUsuarioDto) {
    const existente = await this.prisma.usuario.findUnique({
      where: { login: createUsuarioDto.login },
    });

    if (existente) {
      throw new ConflictException('Login já está em uso.');
    }

    const salt = await bcrypt.genSalt();
    const senhaCriptografada = await bcrypt.hash(createUsuarioDto.senha, salt);

    return this.prisma.$transaction(async (prisma) => {
      let pessoa = await prisma.pessoa.findUnique({
        where: { email: createUsuarioDto.login },
      });

      if (!pessoa) {
        pessoa = await prisma.pessoa.create({
          data: {
            nome: createUsuarioDto.nome,
            email: createUsuarioDto.login,
          },
        });
      }

      const usuario = await prisma.usuario.create({
        data: {
          login: createUsuarioDto.login,
          senha: senhaCriptografada,
          papel: createUsuarioDto.papel,
          pessoaId: pessoa.id,
        },
      });

      const { senha, ...resultado } = usuario;
      return {
        ...resultado,
        nome: pessoa.nome,
      };
    });
  }

  async buscarTodos() {
    const usuarios = await this.prisma.usuario.findMany({
      include: { pessoa: true },
    });
    return usuarios.map(u => {
      const { senha, ...resultado } = u;
      return {
        ...resultado,
        nome: u.pessoa?.nome || 'Sem Nome',
      };
    });
  }

  async buscarUm(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { pessoa: true },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
    }
    const { senha, ...resultado } = usuario;
    return {
      ...resultado,
      nome: usuario.pessoa?.nome || 'Sem Nome',
    };
  }

  async buscarPorLogin(login: string) {
    return this.prisma.usuario.findUnique({
      where: { login },
      include: { pessoa: true },
    });
  }

  async atualizar(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { pessoa: true },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
    }

    const dadosUsuario: any = {};
    if (updateUsuarioDto.senha) {
      const salt = await bcrypt.genSalt();
      dadosUsuario.senha = await bcrypt.hash(updateUsuarioDto.senha, salt);
    }
    if (updateUsuarioDto.papel) {
      dadosUsuario.papel = updateUsuarioDto.papel;
    }
    if (updateUsuarioDto.login) {
      dadosUsuario.login = updateUsuarioDto.login;
    }

    return this.prisma.$transaction(async (prisma) => {
      if (usuario.pessoaId) {
        const dadosPessoa: any = {};
        if (updateUsuarioDto.nome) {
          dadosPessoa.nome = updateUsuarioDto.nome;
        }
        if (updateUsuarioDto.login) {
          dadosPessoa.email = updateUsuarioDto.login;
        }

        if (Object.keys(dadosPessoa).length > 0) {
          await prisma.pessoa.update({
            where: { id: usuario.pessoaId },
            data: dadosPessoa,
          });
        }
      }

      const atualizado = await prisma.usuario.update({
        where: { id },
        data: dadosUsuario,
        include: { pessoa: true },
      });

      const { senha, ...resultado } = atualizado;
      return {
        ...resultado,
        nome: atualizado.pessoa?.nome || 'Sem Nome',
      };
    });
  }

  async remover(id: number) {
    const usuario = await this.buscarUm(id);
    const removido = await this.prisma.usuario.delete({ where: { id } });
    const { senha, ...resultado } = removido;
    return resultado;
  }
}

