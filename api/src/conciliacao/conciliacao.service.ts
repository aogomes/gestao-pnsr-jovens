import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateConciliacaoDto,
  CreateConciliacaoItemDto,
} from './dto/create-conciliacao.dto';
import { UpdateConciliacaoDto } from './dto/update-conciliacao.dto';
import { AssociarPessoaDto } from './dto/associar-pessoa.dto';

@Injectable()
export class ConciliacaoService {
  constructor(private readonly prisma: PrismaService) { }

  async criar(dto: CreateConciliacaoDto) {
    return this.prisma.$transaction(async (tx) => {
      const conciliacao = await tx.conciliacao.create({
        data: {
          mes: dto.mes,
          ano: dto.ano,
          descricao: dto.descricao,
          contaId: dto.contaId || null,
          status: 'ABERTA',
        },
      });

      if (dto.itens && dto.itens.length > 0) {
        const itensData = dto.itens.map((item) => {
          const isRendeFacil =
            (item.tipoLancamento || '').toLowerCase().includes('bb rende') ||
            (item.historico || '').toLowerCase().includes('bb rende');
          const desconsiderado = item.pessoaId
            ? false
            : item.desconsiderado !== undefined
              ? Boolean(item.desconsiderado)
              : isRendeFacil;

          return {
            conciliacaoId: conciliacao.id,
            dataLancamento: new Date(item.dataLancamento),
            lote: item.lote || null,
            documento: item.documento || null,
            historico: item.historico,
            tipoLancamento: item.tipoLancamento || null,
            cpf: item.cpf || null,
            nomeExtrato: item.nomeExtrato || null,
            valor: item.valor,
            tipo: item.tipo || 'CREDITO',
            desconsiderado,
            pessoaId: desconsiderado ? null : item.pessoaId || null,
          };
        });

        await tx.conciliacaoItem.createMany({
          data: itensData,
        });
      }

      return this.buscarUma(conciliacao.id, tx);
    });
  }

  async listarTodas(filtros?: { mes?: number; ano?: number; contaId?: number }) {
    const where: any = {};
    if (filtros?.mes) where.mes = Number(filtros.mes);
    if (filtros?.ano) where.ano = Number(filtros.ano);
    if (filtros?.contaId) where.contaId = Number(filtros.contaId);

    const conciliacoes = await this.prisma.conciliacao.findMany({
      where,
      include: {
        conta: true,
        itens: {
          select: {
            id: true,
            lote: true,
            tipoLancamento: true,
            cpf: true,
            valor: true,
            tipo: true,
            desconsiderado: true,
            pessoaId: true,
          },
        },
      },
      orderBy: [{ ano: 'desc' }, { mes: 'desc' }, { id: 'desc' }],
    });

    return conciliacoes.map((c) => {
      const totalItens = c.itens.length;
      const itensAssociados = c.itens.filter(
        (i) => i.pessoaId !== null || i.desconsiderado,
      ).length;
      const itensComCpf = c.itens.filter((i) => !!i.cpf).length;
      const itensComCpfAssociados = c.itens.filter(
        (i) => !!i.cpf && (i.pessoaId !== null || i.desconsiderado),
      ).length;
      const totalCreditos = c.itens
        .filter(
          (i) =>
            !i.desconsiderado &&
            (i.tipo === 'CREDITO' || i.tipo === 'RECEITA'),
        )
        .reduce((acc, i) => acc + i.valor, 0);
      const totalDebitos = c.itens
        .filter(
          (i) =>
            !i.desconsiderado &&
            (i.tipo === 'DEBITO' || i.tipo === 'DESPESA'),
        )
        .reduce((acc, i) => acc + i.valor, 0);

      const { itens, ...rest } = c;
      return {
        ...rest,
        resumo: {
          totalItens,
          itensAssociados,
          itensComCpf,
          itensComCpfAssociados,
          totalCreditos,
          totalDebitos,
        },
      };
    });
  }

  async buscarUma(id: number, txClient?: any) {
    const client = txClient || this.prisma;
    const conciliacao = await client.conciliacao.findUnique({
      where: { id },
      include: {
        conta: true,
        itens: {
          include: {
            pessoa: {
              select: {
                id: true,
                nome: true,
                documento: true,
                email: true,
                telefone: true,
              },
            },
          },
          orderBy: [{ dataLancamento: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!conciliacao) {
      throw new NotFoundException(`Conciliação #${id} não encontrada.`);
    }

    return conciliacao;
  }

  async atualizar(id: number, dto: UpdateConciliacaoDto) {
    await this.buscarUma(id);
    return this.prisma.conciliacao.update({
      where: { id },
      data: {
        ...(dto.mes !== undefined ? { mes: dto.mes } : {}),
        ...(dto.ano !== undefined ? { ano: dto.ano } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.contaId !== undefined ? { contaId: dto.contaId } : {}),
      },
      include: { conta: true },
    });
  }

  async adicionarItens(id: number, itens: CreateConciliacaoItemDto[]) {
    await this.buscarUma(id);
    const itensData = itens.map((item) => {
      const isRendeFacil =
        (item.tipoLancamento || '').toLowerCase().includes('bb rende') ||
        (item.historico || '').toLowerCase().includes('bb rende');
      const desconsiderado = item.pessoaId
        ? false
        : item.desconsiderado !== undefined
          ? Boolean(item.desconsiderado)
          : isRendeFacil;

      return {
        conciliacaoId: id,
        dataLancamento: new Date(item.dataLancamento),
        lote: item.lote || null,
        documento: item.documento || null,
        historico: item.historico,
        tipoLancamento: item.tipoLancamento || null,
        cpf: item.cpf || null,
        nomeExtrato: item.nomeExtrato || null,
        valor: item.valor,
        tipo: item.tipo || 'CREDITO',
        desconsiderado,
        pessoaId: desconsiderado ? null : item.pessoaId || null,
      };
    });

    await this.prisma.conciliacaoItem.createMany({
      data: itensData,
    });

    return this.buscarUma(id);
  }

  async associarPessoaItem(itemId: number, dto: AssociarPessoaDto) {
    const item = await this.prisma.conciliacaoItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de conciliação #${itemId} não encontrado.`,
      );
    }

    const isDesconsiderado = Boolean(dto.desconsiderado);

    return this.prisma.$transaction(async (tx) => {
      const atualizado = await tx.conciliacaoItem.update({
        where: { id: itemId },
        data: {
          desconsiderado: isDesconsiderado,
          pessoaId: isDesconsiderado ? null : (dto.pessoaId ?? null),
        },
        include: {
          pessoa: {
            select: {
              id: true,
              nome: true,
              documento: true,
              email: true,
              telefone: true,
            },
          },
        },
      });

      if (
        !isDesconsiderado &&
        dto.atualizarCpfCadastro &&
        dto.pessoaId &&
        item.cpf
      ) {
        await tx.pessoa.update({
          where: { id: dto.pessoaId },
          data: { documento: item.cpf },
        });
      }

      return atualizado;
    });
  }

  async removerItem(itemId: number) {
    const item = await this.prisma.conciliacaoItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException(
        `Item de conciliação #${itemId} não encontrado.`,
      );
    }
    return this.prisma.conciliacaoItem.delete({
      where: { id: itemId },
    });
  }

  async remover(id: number) {
    await this.buscarUma(id);
    return this.prisma.conciliacao.delete({
      where: { id },
    });
  }
}
