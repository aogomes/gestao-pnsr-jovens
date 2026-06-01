import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { TipoTransacao } from '@prisma/client';

@Injectable()
export class ContasService {
  constructor(private prisma: PrismaService) {}

  async criar(dto: CreateContaDto) {
    return this.prisma.$transaction(async (prisma) => {
      const conta = await prisma.conta.create({
        data: dto,
      });

      if (dto.saldo && dto.saldo > 0) {
        await prisma.transacao.create({
          data: {
            valor: dto.saldo,
            tipo: TipoTransacao.RECEITA,
            descricao: 'Saldo Inicial da Conta',
            contaId: conta.id,
            data: new Date()
          }
        });
      }

      return conta;
    });
  }

  async buscarUma(id: number) {
    const conta = await this.prisma.conta.findUnique({
      where: { id },
      include: {
        paroquia: true,
        transacoes: {
          orderBy: { data: 'desc' }
        },
        lancamentosExtrato: true
      }
    });

    if (!conta) {
      throw new NotFoundException(`Conta com ID ${id} não encontrada.`);
    }

    let saldoCalculado = conta.transacoes.reduce((acc: number, t: any) => {
      return t.tipo === 'RECEITA' ? acc + t.valor : acc - t.valor;
    }, 0);

    saldoCalculado += conta.lancamentosExtrato?.reduce((acc: number, l: any) => {
      return l.tipo === 'RECEITA' ? acc + l.valor : acc - l.valor;
    }, 0) || 0;

    return { ...conta, saldo: saldoCalculado };
  }

  async listarPorParoquia(paroquiaId: number) {
    const contas = await this.prisma.conta.findMany({
      where: { paroquiaId },
      include: {
        transacoes: {
          orderBy: { data: 'desc' }
        },
        lancamentosExtrato: true
      },
      orderBy: { nome: 'asc' },
    });

    return contas.map(c => {
      let saldoCalculado = c.transacoes.reduce((acc: number, t: any) => {
        return t.tipo === 'RECEITA' ? acc + t.valor : acc - t.valor;
      }, 0);
      saldoCalculado += c.lancamentosExtrato?.reduce((acc: number, l: any) => {
        return l.tipo === 'RECEITA' ? acc + l.valor : acc - l.valor;
      }, 0) || 0;
      return { ...c, saldo: saldoCalculado };
    });
  }

  async listarTodas() {
    const contas = await this.prisma.conta.findMany({
      include: { 
        paroquia: true,
        transacoes: {
          orderBy: { data: 'desc' }
        },
        lancamentosExtrato: true
      },
      orderBy: { nome: 'asc' },
    });

    return contas.map(c => {
      let saldoCalculado = c.transacoes.reduce((acc: number, t: any) => {
        return t.tipo === 'RECEITA' ? acc + t.valor : acc - t.valor;
      }, 0);
      saldoCalculado += c.lancamentosExtrato?.reduce((acc: number, l: any) => {
        return l.tipo === 'RECEITA' ? acc + l.valor : acc - l.valor;
      }, 0) || 0;
      return { ...c, saldo: saldoCalculado };
    });
  }

  async atualizar(id: number, dto: any) {
    return this.prisma.conta.update({
      where: { id },
      data: dto,
    });
  }

  async remover(id: number) {
    return this.prisma.conta.delete({
      where: { id },
    });
  }
}
