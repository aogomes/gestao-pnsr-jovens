import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInscricaoDto } from './dto/create-inscricao.dto';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';

@Injectable()
export class InscricoesService {
  constructor(private prisma: PrismaService) { }

  async criar(createInscricaoDto: CreateInscricaoDto) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: createInscricaoDto.eventoId },
    });

    if (!evento) {
      throw new BadRequestException('Evento não encontrado.');
    }

    if (evento.status !== 'ATIVO') {
      throw new BadRequestException('Não é possível se inscrever em eventos que não estão ativos.');
    }

    if (new Date() > new Date(evento.limiteInscricao)) {
      throw new BadRequestException('A data limite para inscrições já expirou.');
    }

    return this.prisma.inscricao.create({ data: createInscricaoDto });
  }

  async buscarTodas(eventoId?: number) {
    const inscricoes = await this.prisma.inscricao.findMany({
      where: eventoId ? { eventoId } : {},
      include: {
        pessoa: true,
        evento: true,
        transacoes: true
      },
    });

    if (inscricoes.length === 0) return [];

    const pessoaIds = [...new Set(inscricoes.map(i => i.pessoaId))];

    const transacoesAgregadas = await this.prisma.transacao.groupBy({
      by: ['pessoaId', 'tipo'],
      where: { 
        pessoaId: { in: pessoaIds },
        ...(eventoId ? { eventoId } : {})
      },
      _sum: { valor: true }
    });

    const saldosMap: Record<number, number> = {};
    pessoaIds.forEach(id => { saldosMap[id] = 0; });

    transacoesAgregadas.forEach(t => {
      if (t.pessoaId !== null) {
        if (t.tipo === 'RECEITA') saldosMap[t.pessoaId] += (t._sum.valor || 0);
        if (t.tipo === 'DESPESA') saldosMap[t.pessoaId] -= (t._sum.valor || 0);
      }
    });

    return inscricoes.map((insc) => {
      const saldoCalculado = Number(Number(saldosMap[insc.pessoaId]).toFixed(2)) || 0;

      // Sintetizar dinamicamente o array de pagamentos a partir de transacoes
      const pagamentosSintetizados = insc.transacoes
        .filter((t) => t.pessoaId === insc.pessoaId)
        .map((t) => ({
          id: t.id,
          valor: t.tipo === 'DESPESA' ? t.valor : -t.valor,
          data: t.data,
          metodo: t.metodo || 'SALDO',
          observacao: t.descricao
        }));

      return {
        ...insc,
        pessoa: { ...insc.pessoa, saldo: saldoCalculado },
        pagamentos: pagamentosSintetizados
      };
    });
  }

  remover(id: number) {
    return this.prisma.inscricao.delete({ where: { id } });
  }

  async atualizarStatus(id: number, status: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Buscar a inscrição com suas transações e dados do evento
      const inscricao = await tx.inscricao.findUnique({
        where: { id },
        include: { transacoes: true, evento: true }
      });

      if (!inscricao) {
        throw new BadRequestException('Inscrição não encontrada.');
      }

      // 2. Se o novo status for CANCELADO e houver pagamentos de débito da pessoa vinculados, realiza o estorno de partida dobrada
      if (status === 'CANCELADO' && inscricao.transacoes && inscricao.transacoes.length > 0) {
        const pagamentosDebito = inscricao.transacoes.filter(
          (t) => t.pessoaId === inscricao.pessoaId && t.tipo === 'DESPESA'
        );

        for (const pagamento of pagamentosDebito) {
          // 2.1. Criar transação financeira de RECEITA (estorno) para a pessoa
          await tx.transacao.create({
            data: {
              valor: pagamento.valor,
              tipo: 'RECEITA',
              descricao: `Estorno Pagamento Inscrição: ${inscricao.evento.nome}`,
              pessoaId: inscricao.pessoaId,
              inscricaoId: id,
              eventoId: inscricao.eventoId,
              origem: 'EVENTOS',
              data: new Date()
            }
          });

          // 2.2. Criar transação financeira de DESPESA (estorno) para a Conta Bancária do Evento
          await tx.transacao.create({
            data: {
              valor: pagamento.valor,
              tipo: 'DESPESA',
              descricao: `Estorno Recebimento Inscrição: ${inscricao.evento.nome}`,
              contaId: inscricao.evento.contaId,
              inscricaoId: id,
              eventoId: inscricao.eventoId,
              origem: 'EVENTOS',
              data: new Date()
            }
          });

          // 2.3. Decrementar o saldo físico da Conta correspondente
          await tx.conta.update({
            where: { id: inscricao.evento.contaId },
            data: { saldo: { decrement: pagamento.valor } }
          });
        }
      }

      // 3. Atualizar o status da inscrição
      return tx.inscricao.update({
        where: { id },
        data: { status }
      });
    });
  }

  async adicionarPagamento(createPagamentoDto: CreatePagamentoDto) {
    if (createPagamentoDto.metodo !== 'SALDO') {
      throw new BadRequestException('Os pagamentos de inscrição devem ser realizados exclusivamente via SALDO. Por favor, adicione crédito à pessoa primeiro.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Buscar a inscrição e a pessoa para validar saldo
      const inscricao = await tx.inscricao.findUnique({
        where: { id: createPagamentoDto.inscricaoId },
        include: {
          pessoa: {
            include: {
              transacoes: true
            }
          },
          evento: true
        }
      });

      if (!inscricao) throw new BadRequestException('Inscrição não encontrada.');

      if (inscricao.status !== 'CONFIRMADO') {
        throw new BadRequestException('Não é possível realizar pagamentos para inscrições que não estão confirmadas.');
      }

      const saldoCalculado = inscricao.pessoa.transacoes.reduce((acc: number, t: any) => {
        if (t.tipo === 'RECEITA') return acc + t.valor;
        if (t.tipo === 'DESPESA') return acc - t.valor;
        return acc;
      }, 0);

      if (Math.round(saldoCalculado * 100) < Math.round(createPagamentoDto.valor * 100)) {
        throw new BadRequestException(`Saldo insuficiente. Saldo atual: R$ ${saldoCalculado.toFixed(2)}`);
      }

      // 2. Criar a transação financeira (DÉBITO/DESPESA) para a Pessoa
      const transacaoPessoa = await tx.transacao.create({
        data: {
          valor: createPagamentoDto.valor,
          tipo: 'DESPESA',
          descricao: `Pagamento: ${inscricao.evento.nome}`,
          pessoaId: inscricao.pessoaId,
          inscricaoId: inscricao.id,
          eventoId: inscricao.eventoId,
          origem: 'EVENTOS',
          data: new Date()
        }
      });

      // 3. Criar a transação financeira (RECEITA) para a Conta Bancária do Evento
      const transacaoConta = await tx.transacao.create({
        data: {
          valor: createPagamentoDto.valor,
          tipo: 'RECEITA',
          descricao: `Recebimento [${inscricao.pessoa.nome}]: ${inscricao.evento.nome}`,
          contaId: inscricao.evento.contaId,
          inscricaoId: inscricao.id,
          eventoId: inscricao.eventoId,
          origem: 'EVENTOS',
          data: new Date()
        }
      });

      // 4. Incrementar o saldo da conta paroquial na base de dados
      await tx.conta.update({
        where: { id: inscricao.evento.contaId },
        data: { saldo: { increment: createPagamentoDto.valor } }
      });

      // Retorna objeto sintetizado para total compatibilidade
      return {
        id: transacaoPessoa.id,
        valor: transacaoPessoa.valor,
        data: transacaoPessoa.data,
        metodo: 'SALDO',
        observacao: transacaoPessoa.descricao,
        inscricaoId: inscricao.id,
        transacaoId: transacaoPessoa.id
      };
    });
  }

  async registrarDesistencia(id: number, opcao: string, targetPessoaId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const inscricao = await tx.inscricao.findUnique({
        where: { id },
        include: { transacoes: true, evento: true }
      });

      if (!inscricao) {
        throw new BadRequestException('Inscrição não encontrada.');
      }

      if (inscricao.status !== 'CONFIRMADO') {
        throw new BadRequestException('Apenas inscrições confirmadas podem ser objeto de desistência.');
      }

      if (targetPessoaId) {
        const p = await tx.pessoa.findUnique({ where: { id: targetPessoaId } });
        if (!p) throw new BadRequestException('Pessoa de destino não encontrada.');
      }

      const pagamentosDebito = inscricao.transacoes.filter(
        (t) => t.pessoaId === inscricao.pessoaId && t.tipo === 'DESPESA'
      );

      for (const pagamento of pagamentosDebito) {
        if (opcao === 'SALDO') {
          const pessoaDestino = targetPessoaId || inscricao.pessoaId;
          await tx.transacao.create({
            data: {
              valor: pagamento.valor,
              tipo: 'RECEITA',
              descricao: `Crédito de Desistência: ${inscricao.evento.nome}`,
              pessoaId: pessoaDestino,
              inscricaoId: id,
              eventoId: inscricao.eventoId,
              origem: 'EVENTOS',
              data: new Date()
            }
          });
        }
        
        await tx.transacao.create({
          data: {
            valor: pagamento.valor,
            tipo: 'DESPESA',
            descricao: `Estorno Desistência Inscrição: ${inscricao.evento.nome}`,
            contaId: inscricao.evento.contaId,
            inscricaoId: id,
            eventoId: inscricao.eventoId,
            origem: 'EVENTOS',
            data: new Date()
          }
        });

        await tx.conta.update({
          where: { id: inscricao.evento.contaId },
          data: { saldo: { decrement: pagamento.valor } }
        });
      }

      return tx.inscricao.update({
        where: { id },
        data: { status: 'CANCELADO' }
      });
    });
  }
}

