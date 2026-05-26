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

