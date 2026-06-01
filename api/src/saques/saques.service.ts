import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrigemTransacao } from '@prisma/client';
import { CreateSaqueDto } from './dto/create-saque.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class SaquesService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(createSaqueDto: CreateSaqueDto) {
    const { data, ...rest } = createSaqueDto;
    
    // Verifica se a pessoa existe
    const pessoa = await this.prisma.pessoa.findUnique({
      where: { id: rest.pessoaId },
    });
    if (!pessoa) {
      throw new NotFoundException(`Pessoa com ID ${rest.pessoaId} não encontrada`);
    }

    // Verifica se a pessoa está inscrita no evento
    const inscrito = await this.prisma.inscricao.findUnique({
      where: { pessoaId_eventoId: { pessoaId: rest.pessoaId, eventoId: rest.eventoId } }
    });
    if (!inscrito) {
      throw new BadRequestException('Apenas pessoas inscritas no evento podem realizar saques deste evento.');
    }

    // Calcular saldo específico no evento de forma pura
    const transacoes = await this.prisma.transacao.findMany({
      where: { pessoaId: rest.pessoaId, eventoId: rest.eventoId }
    });
    const saldoDisponivel = transacoes.reduce((acc: number, t: any) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0);

    if (Math.round(saldoDisponivel * 100) < Math.round(rest.valor * 100)) {
      throw new BadRequestException(
        `Saldo insuficiente para este evento. Saldo disponível: R$ ${saldoDisponivel.toFixed(2)}`
      );
    }

    const evento = await this.prisma.evento.findUnique({
      where: { id: rest.eventoId },
    });
    if (!evento) {
      throw new NotFoundException(`Evento com ID ${rest.eventoId} não encontrado`);
    }

    return this.prisma.$transaction(async (tx) => {
      const saqueId = randomUUID().substring(0, 8).toUpperCase();
      const descricaoBase = rest.descricao || 'Retirada de saldo';

      // 1. Criar a Transação de DESPESA correspondente da Pessoa (Débito do participante)
      const transacaoPessoa = await tx.transacao.create({
        data: {
          valor: rest.valor,
          tipo: 'DESPESA',
          origem: OrigemTransacao.SAQUE,
          descricao: `[SAQUE-${saqueId}] Saque efetuado: ${descricaoBase}`,
          pessoaId: rest.pessoaId,
          contaId: null,
          eventoId: rest.eventoId,
          data: data ? new Date(data) : new Date(),
        }
      });

      // 2. Criar a Transação de DESPESA correspondente na Conta do Evento (Débito do caixa da paróquia/evento)
      await tx.transacao.create({
        data: {
          valor: rest.valor,
          tipo: 'DESPESA',
          origem: OrigemTransacao.SAQUE,
          descricao: `[SAQUE-${saqueId}] Saque efetuado (Saída Caixa): ${descricaoBase} - ${pessoa.nome}`,
          pessoaId: null,
          contaId: evento.contaId,
          eventoId: rest.eventoId,
          data: data ? new Date(data) : new Date(),
        }
      });

      // 3. Atualizar o saldo físico da Conta no banco de dados decrementando o valor sacado
      await tx.conta.update({
        where: { id: evento.contaId },
        data: {
          saldo: {
            decrement: rest.valor
          }
        }
      });

      return transacaoPessoa;
    });
  }

  async buscarPorPessoa(pessoaId: number) {
    // Verifica se a pessoa existe
    const pessoa = await this.prisma.pessoa.findUnique({
      where: { id: pessoaId },
    });
    if (!pessoa) {
      throw new NotFoundException(`Pessoa com ID ${pessoaId} não encontrada`);
    }

    // Busca apenas transações de DESPESA que tenham a origem SAQUE ou descrição de legados
    return this.prisma.transacao.findMany({
      where: { 
        pessoaId,
        tipo: 'DESPESA',
        OR: [
          { origem: OrigemTransacao.SAQUE },
          { descricao: { startsWith: '[SAQUE' } }
        ]
      },
      orderBy: { data: 'desc' },
    });
  }

  async remover(id: number) {
    const transacaoDespesa = await this.prisma.transacao.findUnique({
      where: { id },
      include: { evento: true }
    });
    if (!transacaoDespesa) {
      throw new NotFoundException(`Transação de saque com ID ${id} não encontrada`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Extrai a tag identificadora [SAQUE-ABCD] ou [SAQUE #123] da descrição para achar a transação espelho na conta
      const match = transacaoDespesa.descricao.match(/^(\[SAQUE[A-Za-z0-9\s#-]+\])/);
      const tag = match ? match[1] : null;

      if (tag) {
        // 1. Buscar a Transação da Conta correspondente ao saque para estornar o saldo
        const transacaoConta = await tx.transacao.findFirst({
          where: {
            contaId: { not: null },
            descricao: { startsWith: tag },
            eventoId: transacaoDespesa.eventoId
          }
        });

        if (transacaoConta && transacaoDespesa.evento) {
          const ehDespesa = transacaoConta.tipo === 'DESPESA';
          // Estornar o saldo da Conta incrementando o valor de volta
          await tx.conta.update({
            where: { id: transacaoDespesa.evento.contaId },
            data: {
              saldo: ehDespesa ? { increment: transacaoConta.valor } : { decrement: transacaoConta.valor }
            }
          });

          // Deletar a transação espelho
          await tx.transacao.delete({
            where: { id: transacaoConta.id }
          });
        }
      }

      // 3. Deletar a transação original do saque da pessoa
      return tx.transacao.delete({
        where: { id },
      });
    });
  }
}
