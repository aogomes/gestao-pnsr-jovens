import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateConciliacaoDto,
  CreateConciliacaoItemDto,
} from './dto/create-conciliacao.dto';
import { UpdateConciliacaoDto } from './dto/update-conciliacao.dto';
import { AssociarPessoaDto } from './dto/associar-pessoa.dto';
import { RatearConciliacaoDto } from './dto/ratear-conciliacao.dto';

@Injectable()
export class ConciliacaoService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "conciliacao" (
          "id" SERIAL NOT NULL,
          "mes" INTEGER NOT NULL,
          "ano" INTEGER NOT NULL,
          "descricao" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'ABERTA',
          "id_conta" INTEGER,
          "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "conciliacao_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "conciliacao_id_conta_fkey" FOREIGN KEY ("id_conta") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "conciliacao_itens" (
          "id" SERIAL NOT NULL,
          "id_conciliacao" INTEGER NOT NULL,
          "data_lancamento" TIMESTAMP(3) NOT NULL,
          "lote" TEXT,
          "documento" TEXT,
          "historico" TEXT NOT NULL,
          "tipo_lancamento" TEXT,
          "cpf" TEXT,
          "nome_extrato" TEXT,
          "valor" DOUBLE PRECISION NOT NULL,
          "tipo" TEXT NOT NULL DEFAULT 'CREDITO',
          "desconsiderado" BOOLEAN NOT NULL DEFAULT false,
          "id_pessoa" INTEGER,
          "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "conciliacao_itens_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "conciliacao_itens_id_conciliacao_fkey" FOREIGN KEY ("id_conciliacao") REFERENCES "conciliacao"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "conciliacao_itens_id_pessoa_fkey" FOREIGN KEY ("id_pessoa") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
      `);
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE "transacoes" ADD COLUMN IF NOT EXISTS "id_conciliacao" INTEGER;
      `);
      await this.prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'transacoes_id_conciliacao_fkey'
          ) THEN
            ALTER TABLE "transacoes"
            ADD CONSTRAINT "transacoes_id_conciliacao_fkey"
            FOREIGN KEY ("id_conciliacao") REFERENCES "conciliacao"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END
        $$;
      `);
    } catch (err) {
      console.warn('Aviso ao verificar tabelas de conciliação no boot:', err);
    }
  }

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

    let mapaContagemRateio: Record<number, number> = {};
    try {
      const rows: { id_conciliacao: number; qtd: number }[] =
        await this.prisma.$queryRawUnsafe(`
          SELECT "id_conciliacao", COUNT(*)::int AS "qtd"
          FROM "transacoes"
          WHERE "id_conciliacao" IS NOT NULL
          GROUP BY "id_conciliacao"
        `);
      rows.forEach((r) => {
        if (r.id_conciliacao) {
          mapaContagemRateio[Number(r.id_conciliacao)] = Number(r.qtd || 0);
        }
      });
    } catch {
      mapaContagemRateio = {};
    }

    return conciliacoes.map((c) => {
      const totalItens = c.itens.length;
      const itensAssociados = c.itens.filter(
        (i) => i.pessoaId !== null || i.desconsiderado,
      ).length;
      const itensPendentes = c.itens.filter(
        (i) => i.pessoaId === null && !i.desconsiderado,
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
      const totalIdentificadoPessoas = c.itens
        .filter((i) => i.pessoaId !== null && !i.desconsiderado)
        .reduce((acc, i) => acc + i.valor, 0);

      const { itens, ...rest } = c;
      return {
        ...rest,
        resumo: {
          totalItens,
          itensAssociados,
          itensPendentes,
          itensComCpf,
          itensComCpfAssociados,
          totalCreditos,
          totalDebitos,
          totalIdentificadoPessoas,
          qtdTransacoesRateio: mapaContagemRateio[c.id] || 0,
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

    let transacoes: any[] = [];
    try {
      const rows: any[] = await client.$queryRawUnsafe(
        `
          SELECT
            t."id",
            t."valor",
            t."tipo",
            t."origem",
            t."descricao",
            t."metodo",
            t."data",
            t."pessoaId",
            t."contaId",
            t."eventoId",
            t."id_conciliacao" AS "conciliacaoId",
            p."nome" AS "pessoaNome",
            p."documento" AS "pessoaDocumento",
            e."nome" AS "eventoNome",
            c."nome" AS "contaNome"
          FROM "transacoes" t
          LEFT JOIN "pessoas" p ON p."id" = t."pessoaId"
          LEFT JOIN "eventos" e ON e."id" = t."eventoId"
          LEFT JOIN "contas" c ON c."id" = t."contaId"
          WHERE t."id_conciliacao" = $1
          ORDER BY p."nome" ASC NULLS LAST, t."id" ASC
        `,
        id,
      );
      transacoes = rows.map((r) => ({
        id: r.id,
        valor: Number(r.valor),
        tipo: r.tipo,
        origem: r.origem,
        descricao: r.descricao,
        metodo: r.metodo,
        data: r.data,
        pessoaId: r.pessoaId,
        contaId: r.contaId,
        eventoId: r.eventoId,
        conciliacaoId: r.conciliacaoId,
        pessoa: r.pessoaId
          ? {
              id: r.pessoaId,
              nome: r.pessoaNome,
              documento: r.pessoaDocumento,
            }
          : null,
        evento: r.eventoId ? { id: r.eventoId, nome: r.eventoNome } : null,
        conta: r.contaId ? { id: r.contaId, nome: r.contaNome } : null,
      }));
    } catch {
      transacoes = [];
    }

    return {
      ...conciliacao,
      transacoes,
    };
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
    const conciliacao = await this.buscarUma(id);
    if (conciliacao.status === 'CONCILIADA') {
      throw new BadRequestException(
        'Não é permitido adicionar itens em uma conciliação já rateada. Estorne o rateio primeiro.',
      );
    }
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
      include: { conciliacao: true },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de conciliação #${itemId} não encontrado.`,
      );
    }

    if (item.conciliacao?.status === 'CONCILIADA') {
      throw new BadRequestException(
        'Esta conciliação já possui rateio concluído. Estorne o rateio antes de alterar as associações.',
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

  async ratear(id: number, dto: RatearConciliacaoDto) {
    const conciliacao = await this.buscarUma(id);

    if (
      conciliacao.status === 'CONCILIADA' ||
      (conciliacao.transacoes && conciliacao.transacoes.length > 0)
    ) {
      throw new BadRequestException(
        'Esta conciliação já possui rateio realizado. Caso precise refazer, estorne o rateio atual primeiro.',
      );
    }

    const itensPendentes = (conciliacao.itens || []).filter(
      (i: any) => i.pessoaId === null && !Boolean(i.desconsiderado),
    );
    if (itensPendentes.length > 0) {
      throw new BadRequestException(
        `Não é possível realizar o rateio enquanto houver itens pendentes (${itensPendentes.length} item(ns) sem associação). Todos os itens devem estar associados ou desconsiderados (0 Pendentes).`,
      );
    }

    const itensAssociados = (conciliacao.itens || []).filter(
      (i: any) => i.pessoaId !== null && !Boolean(i.desconsiderado),
    );
    if (itensAssociados.length === 0) {
      throw new BadRequestException(
        'Não há nenhum lançamento associado a pessoas nesta conciliação para realizar o rateio.',
      );
    }

    const totalIdentificado = Number(
      itensAssociados
        .reduce((acc: number, i: any) => acc + Number(i.valor || 0), 0)
        .toFixed(2),
    );

    if (totalIdentificado <= 0) {
      throw new BadRequestException(
        'O valor total identificado na conciliação deve ser maior que zero.',
      );
    }

    if (!dto.eventoId) {
      throw new BadRequestException(
        'Selecione o Evento para vincular as transações geradas pelo rateio.',
      );
    }

    const evento = await this.prisma.evento.findUnique({
      where: { id: Number(dto.eventoId) },
    });
    if (!evento) {
      throw new NotFoundException('Evento selecionado não encontrado.');
    }

    const contaIdFinal = dto.contaId
      ? Number(dto.contaId)
      : conciliacao.contaId || evento.contaId || null;

    if (!dto.itens || dto.itens.length === 0) {
      throw new BadRequestException(
        'Informe os itens de rateio por pessoa para gerar as transações.',
      );
    }

    if (dto.itens.some((i) => Number(i.valor) < 0 || isNaN(Number(i.valor)))) {
      throw new BadRequestException(
        'Não são permitidos valores negativos ou inválidos no rateio.',
      );
    }

    // Consolidar por pessoaId caso a mesma pessoa tenha sido enviada mais de uma vez
    const mapaValoresPorPessoa = new Map<number, number>();
    for (const item of dto.itens) {
      const pid = Number(item.pessoaId);
      const val = Number(Number(item.valor || 0).toFixed(2));
      if (val > 0) {
        mapaValoresPorPessoa.set(
          pid,
          Number(((mapaValoresPorPessoa.get(pid) || 0) + val).toFixed(2)),
        );
      }
    }

    const somaRateio = Number(
      Array.from(mapaValoresPorPessoa.values())
        .reduce((acc, v) => acc + v, 0)
        .toFixed(2),
    );

    if (Math.abs(somaRateio - totalIdentificado) >= 0.01) {
      throw new BadRequestException(
        `O valor total do rateio (R$ ${somaRateio.toFixed(2)}) não pode ser maior nem menor que o valor total identificado na conciliação (R$ ${totalIdentificado.toFixed(2)}).`,
      );
    }

    const mesPad = String(conciliacao.mes).padStart(2, '0');
    const descricaoTransacao =
      dto.descricao?.trim() ||
      `Conciliação Bancária ${mesPad}/${conciliacao.ano}`;
    const dataTransacao = dto.data
      ? new Date(`${dto.data.split('T')[0]}T12:00:00.000Z`)
      : new Date();

    return this.prisma.$transaction(async (tx) => {
      for (const [pessoaId, valorPessoa] of mapaValoresPorPessoa.entries()) {
        if (valorPessoa > 0) {
          const criada = await tx.transacao.create({
            data: {
              valor: valorPessoa,
              tipo: 'RECEITA',
              origem: 'DEPOSITO',
              metodo: 'PIX',
              descricao: descricaoTransacao,
              data: dataTransacao,
              pessoaId,
              eventoId: evento.id,
            },
          });
          await tx.$executeRawUnsafe(
            `UPDATE "transacoes" SET "id_conciliacao" = $1 WHERE "id" = $2`,
            conciliacao.id,
            criada.id,
          );
        }
      }

      await tx.conciliacao.update({
        where: { id: conciliacao.id },
        data: {
          status: 'CONCILIADA',
          ...(contaIdFinal ? { contaId: contaIdFinal } : {}),
        },
      });

      return this.buscarUma(conciliacao.id, tx);
    });
  }

  async estornarRateio(id: number) {
    const conciliacao = await this.buscarUma(id);

    if (
      conciliacao.status !== 'CONCILIADA' &&
      (!conciliacao.transacoes || conciliacao.transacoes.length === 0)
    ) {
      throw new BadRequestException(
        'Esta conciliação não possui rateio ativo para estornar.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `DELETE FROM "transacoes" WHERE "id_conciliacao" = $1`,
        id,
      );

      await tx.conciliacao.update({
        where: { id },
        data: { status: 'ABERTA' },
      });

      return this.buscarUma(id, tx);
    });
  }

  async removerItem(itemId: number) {
    const item = await this.prisma.conciliacaoItem.findUnique({
      where: { id: itemId },
      include: { conciliacao: true },
    });
    if (!item) {
      throw new NotFoundException(
        `Item de conciliação #${itemId} não encontrado.`,
      );
    }
    if (item.conciliacao?.status === 'CONCILIADA') {
      throw new BadRequestException(
        'Não é possível remover itens de uma conciliação já rateada. Estorne o rateio primeiro.',
      );
    }
    return this.prisma.conciliacaoItem.delete({
      where: { id: itemId },
    });
  }

  async remover(id: number) {
    const conciliacao = await this.buscarUma(id);
    if (conciliacao.status === 'CONCILIADA') {
      throw new BadRequestException(
        'Não é possível excluir uma conciliação com rateio ativo. Estorne o rateio antes de excluir.',
      );
    }
    return this.prisma.conciliacao.delete({
      where: { id },
    });
  }
}
