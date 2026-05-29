import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaqueDto } from './dto/create-saque.dto';

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

    // Calcular saldo específico no evento
    const transacoes = await this.prisma.transacao.findMany({
      where: { pessoaId: rest.pessoaId, eventoId: rest.eventoId }
    });
    const totalTransacoes = transacoes.reduce((acc: number, t: any) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0);

    const saques = await this.prisma.saque.findMany({
      where: { pessoaId: rest.pessoaId, eventoId: rest.eventoId }
    });
    const totalSaques = saques.reduce((acc: number, s: any) => acc + s.valor, 0);

    const saldoDisponivel = totalTransacoes - totalSaques;

    if (saldoDisponivel < rest.valor) {
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
      // 1. Criar o Saque
      const saque = await tx.saque.create({
        data: {
          ...rest,
          data: data ? new Date(data) : undefined,
        },
      });

      // 2. Criar a Transação de DESPESA correspondente da Pessoa (Débito do participante)
      await tx.transacao.create({
        data: {
          valor: rest.valor,
          tipo: 'DESPESA',
          origem: 'CONTAS',
          descricao: `[SAQUE #${saque.id}] Saque efetuado (Débito Participante): ${rest.descricao || 'Retirada de saldo'} - ${pessoa.nome}`,
          pessoaId: rest.pessoaId, // VINCULADA À PESSOA!
          contaId: null, // Sem conta física para a despesa pessoal
          eventoId: rest.eventoId,
          data: data ? new Date(data) : new Date(),
        }
      });

      // 3. Criar a Transação de RECEITA correspondente na Conta do Evento (Crédito do caixa da paróquia/evento)
      await tx.transacao.create({
        data: {
          valor: rest.valor,
          tipo: 'RECEITA',
          origem: 'CONTAS',
          descricao: `[SAQUE #${saque.id}] Saque efetuado (Crédito Conta): ${rest.descricao || 'Retirada de saldo'} - ${pessoa.nome}`,
          pessoaId: null, // Sem pessoaId para a receita do caixa
          contaId: evento.contaId, // VINCULADA À CONTA DO EVENTO!
          eventoId: rest.eventoId,
          data: data ? new Date(data) : new Date(),
        }
      });

      // 4. Atualizar o saldo físico da Conta no banco de dados incrementando o valor recebido
      await tx.conta.update({
        where: { id: evento.contaId },
        data: {
          saldo: {
            increment: rest.valor
          }
        }
      });

      return saque;
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

    return this.prisma.saque.findMany({
      where: { pessoaId },
      orderBy: { data: 'desc' },
    });
  }

  async remover(id: number) {
    const saque = await this.prisma.saque.findUnique({
      where: { id },
      include: { evento: true }
    });
    if (!saque) {
      throw new NotFoundException(`Saque com ID ${id} não encontrado`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Buscar a Transação de RECEITA correspondente ao saque para estornar o saldo da Conta
      const transacaoReceita = await tx.transacao.findFirst({
        where: {
          tipo: 'RECEITA',
          descricao: {
            startsWith: `[SAQUE #${id}]`
          }
        }
      });

      if (transacaoReceita) {
        // Estornar o saldo da Conta decrementando o valor de volta
        await tx.conta.update({
          where: { id: saque.evento.contaId },
          data: {
            saldo: {
              decrement: saque.valor
            }
          }
        });

        // Deletar a transação correspondente
        await tx.transacao.delete({
          where: { id: transacaoReceita.id }
        });
      }

      // 2. Buscar e deletar a Transação de DESPESA correspondente à pessoa
      const transacaoDespesa = await tx.transacao.findFirst({
        where: {
          tipo: 'DESPESA',
          descricao: {
            startsWith: `[SAQUE #${id}]`
          }
        }
      });

      if (transacaoDespesa) {
        await tx.transacao.delete({
          where: { id: transacaoDespesa.id }
        });
      }

      // 3. Deletar o Saque
      return tx.saque.delete({
        where: { id },
      });
    });
  }
}
