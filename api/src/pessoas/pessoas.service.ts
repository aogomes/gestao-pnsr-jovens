import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(createPessoaDto: CreatePessoaDto, user: any) {
    const dados: any = { 
      ...createPessoaDto,
      paroquiaId: user.papel === 'ADMIN' ? (createPessoaDto.paroquiaId || user.paroquiaId) : user.paroquiaId
    };
    if (dados.email === '') dados.email = null;
    if (dados.dataNascimento === '') dados.dataNascimento = null;
    else if (dados.dataNascimento) dados.dataNascimento = new Date(dados.dataNascimento);

    return this.prisma.$transaction(async (prisma) => {
      const pessoa = await prisma.pessoa.create({ data: dados });

      if (dados.email) {
        // Verifica se o usuário já existe
        const usuarioExistente = await prisma.usuario.findUnique({
          where: { login: dados.email },
        });

        if (!usuarioExistente) {
          const salt = await bcrypt.genSalt();
          const senhaCriptografada = await bcrypt.hash('portal', salt);

          await prisma.usuario.create({
            data: {
              login: dados.email,
              senha: senhaCriptografada,
              papel: 'USUARIO',
              pessoaId: pessoa.id,
            },
          });
        }
      }

      return pessoa;
    });
  }

  async buscarTodas(user: any) {
    const where = user.papel === 'ADMIN' ? { ativo: true } : { paroquiaId: user.paroquiaId, ativo: true };
    const pessoas = await this.prisma.pessoa.findMany({
      where,
      include: { paroquia: true, transacoes: true, saques: true },
      orderBy: { nome: 'asc' }
    });
    return pessoas.map((p: any) => {
      const totalTransacoes = p.transacoes.reduce((acc: number, t: any) => {
        if (t.tipo === 'RECEITA') return acc + t.valor;
        if (t.tipo === 'DESPESA') return acc - t.valor;
        return acc;
      }, 0);
      const totalSaques = p.saques?.reduce((acc: number, s: any) => acc + s.valor, 0) || 0;
      const saldoCalculado = totalTransacoes - totalSaques;
      const { transacoes, ...pessoaSemTransacoes } = p;
      return { ...pessoaSemTransacoes, saldo: saldoCalculado };
    });
  }

  async buscarUma(id: number) {
    const pessoa = await this.prisma.pessoa.findUnique({ 
      where: { id },
      include: { 
        transacoes: {
          orderBy: { data: 'desc' }
        },
        saques: {
          orderBy: { data: 'desc' }
        }
      }
    });
    if (!pessoa) {
      throw new NotFoundException(`Pessoa com ID ${id} não encontrada.`);
    }
    const totalTransacoes = (pessoa as any).transacoes.reduce((acc: number, t: any) => {
        if (t.tipo === 'RECEITA') return acc + t.valor;
        if (t.tipo === 'DESPESA') return acc - t.valor;
        return acc;
    }, 0);
    const totalSaques = (pessoa as any).saques?.reduce((acc: number, s: any) => acc + s.valor, 0) || 0;
    const saldoCalculado = totalTransacoes - totalSaques;
    return { ...pessoa, saldo: saldoCalculado };
  }

  async buscarMeuPerfil(identificador: string) {
    if (!identificador) {
      throw new NotFoundException('Perfil não identificado.');
    }
    const isNumeric = !isNaN(Number(identificador));
    const where: any = isNumeric 
      ? { OR: [{ id: Number(identificador) }, { email: String(identificador) }] }
      : { email: String(identificador) };

    const pessoa = await this.prisma.pessoa.findFirst({
      where,
      include: {
        inscricoes: {
          include: {
            evento: true,
            transacoes: true
          }
        },
        transacoes: {
          orderBy: { data: 'desc' }
        },
        saques: {
          orderBy: { data: 'desc' }
        }
      }
    });

    if (!pessoa) {
      throw new NotFoundException('Perfil não encontrado para o identificador informado.');
    }

    const totalTransacoes = (pessoa as any).transacoes.reduce((acc: number, t: any) => {
        if (t.tipo === 'RECEITA') return acc + t.valor;
        if (t.tipo === 'DESPESA') return acc - t.valor;
        return acc;
    }, 0);
    const totalSaques = (pessoa as any).saques?.reduce((acc: number, s: any) => acc + s.valor, 0) || 0;
    const saldoCalculado = totalTransacoes - totalSaques;

    const inscricoesFormatadas = (pessoa.inscricoes || []).map((insc: any) => {
      const pagamentosSintetizados = (insc.transacoes || [])
        .filter((t: any) => t.pessoaId === pessoa.id)
        .map((t: any) => ({
          id: t.id,
          valor: t.tipo === 'DESPESA' ? t.valor : -t.valor,
          data: t.data,
          metodo: t.metodo || 'SALDO',
          observacao: t.descricao
        }));
      
      const { transacoes, ...inscSemTransacoes } = insc;
      return {
        ...inscSemTransacoes,
        pagamentos: pagamentosSintetizados
      };
    });

    return { ...pessoa, inscricoes: inscricoesFormatadas, saldo: saldoCalculado };
  }

  async atualizar(id: number, updatePessoaDto: UpdatePessoaDto) {
    await this.buscarUma(id);
    const dados: any = { ...updatePessoaDto };
    
    // Proteção contra valores nulos ou vazios em campos obrigatórios
    if (dados.nome === '' || dados.nome === null) {
      delete dados.nome; // Não atualiza o nome se for vazio ou nulo
    }
    
    if (dados.perfis === null) {
      dados.perfis = []; // Garante que perfis seja um array vazio se vier nulo
    }

    if (dados.email === '') dados.email = null;
    
    if (dados.dataNascimento === '') {
      dados.dataNascimento = null;
    } else if (dados.dataNascimento) {
      const data = new Date(dados.dataNascimento);
      if (isNaN(data.getTime())) {
        delete dados.dataNascimento; // Remove se a data for inválida
      } else {
        dados.dataNascimento = data;
      }
    }

    return this.prisma.$transaction(async (prisma) => {
      const pessoaAtualizada = await prisma.pessoa.update({ where: { id }, data: dados });

      if (dados.email) {
        const usuarioVinculado = await prisma.usuario.findUnique({
          where: { pessoaId: id }
        });

        if (usuarioVinculado) {
          await prisma.usuario.update({
            where: { id: usuarioVinculado.id },
            data: { login: dados.email }
          });
        }
      }

      return pessoaAtualizada;
    });
  }

  async remover(id: number) {
    await this.buscarUma(id);
    return this.prisma.$transaction(async (tx) => {
      // 1. Deletar usuário associado para impedir novos logins
      await tx.usuario.deleteMany({ where: { pessoaId: id } });

      // 2. Marcar a pessoa como inativa (Soft-Delete)
      return tx.pessoa.update({
        where: { id },
        data: { ativo: false }
      });
    });
  }
}

