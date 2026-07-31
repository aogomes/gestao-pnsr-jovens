import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransacaoDto } from './dto/create-transacao.dto';
import { UpdateTransacaoDto } from './dto/update-transacao.dto';
import { TipoTransacao } from '@prisma/client';

@Injectable()
export class TransacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(createTransacaoDto: CreateTransacaoDto) {
    const { data: dataTransacao, ...rest } = createTransacaoDto;
    const dados: any = {
      ...rest,
      data: dataTransacao ? new Date(dataTransacao) : undefined,
    };

    // Atualiza a descrição com o método se ele existir (Opção 2)
    if (createTransacaoDto.metodo) {
      dados.descricao = `${createTransacaoDto.descricao} (${createTransacaoDto.metodo})`;
    }

    return this.prisma.$transaction(async (prisma) => {
      const transacao = await prisma.transacao.create({ data: dados });

      const valorAtualizar = createTransacaoDto.tipo === TipoTransacao.RECEITA
        ? createTransacaoDto.valor
        : -createTransacaoDto.valor;



      if (dados.contaId) {
        await prisma.conta.update({
          where: { id: dados.contaId },
          data: { saldo: { increment: valorAtualizar } },
        });
      }

      return transacao;
    });
  }

  buscarTodas() {
    return this.prisma.transacao.findMany({
      include: { pessoa: true, conta: true },
      orderBy: { data: 'desc' },
    });
  }

  async buscarPaginada(query: any) {
    const { page = '1', limit = '50', tipo, vinculo, pessoaId, contaId, dataInicio, dataFim } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (tipo === 'Receitas') where.tipo = 'RECEITA';
    if (tipo === 'Despesas') where.tipo = 'DESPESA';

    if (vinculo === 'PESSOA') {
      where.pessoaId = pessoaId ? Number(pessoaId) : { not: null };
    } else if (vinculo === 'CONTA') {
      where.contaId = contaId ? Number(contaId) : { not: null };
    } else if (vinculo === 'GERAL') {
      where.pessoaId = null;
      where.contaId = null;
    }

    if (dataInicio && dataFim) {
      const dStart = new Date(dataInicio);
      dStart.setUTCHours(0, 0, 0, 0);
      const dEnd = new Date(dataFim);
      dEnd.setUTCHours(23, 59, 59, 999);
      where.data = {
        gte: dStart,
        lte: dEnd
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.transacao.count({ where }),
      this.prisma.transacao.findMany({
        where,
        skip,
        take,
        include: { pessoa: true, conta: true },
        orderBy: { data: 'desc' }
      })
    ]);

    return {
      data,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / take)
    };
  }

  async buscarUma(id: number) {
    const transacao = await this.prisma.transacao.findUnique({
      where: { id },
      include: { pessoa: true, conta: true },
    });
    if (!transacao) {
      throw new NotFoundException(`Transação com ID ${id} não encontrada.`);
    }
    return transacao;
  }

  async atualizar(id: number, updateTransacaoDto: UpdateTransacaoDto) {
    const transacaoOriginal = await this.buscarUma(id);
    const { data: dataTransacao, ...rest } = updateTransacaoDto;
    const dados: any = {
      ...rest,
      data: dataTransacao ? new Date(dataTransacao) : undefined,
    };

    return this.prisma.$transaction(async (prisma) => {
      const transacaoAtualizada = await prisma.transacao.update({ where: { id }, data: dados });

      // Atualiza os saldos estáticos no BD para consistência
      if (transacaoOriginal.contaId) {
        await this.atualizarSaldoConta(transacaoOriginal.contaId, prisma);
      }
      if (dados.contaId && dados.contaId !== transacaoOriginal.contaId) {
        await this.atualizarSaldoConta(dados.contaId, prisma);
      }

      return transacaoAtualizada;
    });
  }

  async remover(id: number) {
    const transacao = await this.buscarUma(id);
    return this.prisma.$transaction(async (prisma) => {
      const deletado = await prisma.transacao.delete({ where: { id } });
      if (transacao.contaId) {
        await this.atualizarSaldoConta(transacao.contaId, prisma);
      }
      return deletado;
    });
  }

  private async atualizarSaldoConta(contaId: number, prisma: any) {
    const transacoes = await prisma.transacao.findMany({
      where: { contaId }
    });
    const saldo = transacoes.reduce((acc: number, t: any) => {
      return t.tipo === 'RECEITA' ? acc + t.valor : acc - t.valor;
    }, 0);
    await prisma.conta.update({
      where: { id: contaId },
      data: { saldo }
    });
  }
}

