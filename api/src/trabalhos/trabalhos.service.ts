import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrabalhoDto } from './dto/create-trabalho.dto';
import { UpdateTrabalhoDto } from './dto/update-trabalho.dto';
import { AddRecebimentoDto } from './dto/add-recebimento.dto';
import { UpdateRecebimentoDto } from './dto/update-recebimento.dto';

@Injectable()
export class TrabalhosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTrabalhoDto: CreateTrabalhoDto) {
    const { membrosIds, ...dados } = createTrabalhoDto;

    return this.prisma.$transaction(async (prisma) => {
      const trabalho = await prisma.trabalho.create({
        data: {
          descricao: dados.descricao,
          tipo: dados.tipo,
          proporcao: dados.proporcao,
          contaId: dados.contaId || null,
          pessoaId: dados.pessoaId || null,
          dataTrabalho: new Date(dados.dataTrabalho),
        },
      });

      if (dados.tipo === 'GRUPO' && membrosIds && membrosIds.length > 0) {
        const membrosData = membrosIds.map((pessoaId) => ({
          trabalhoId: trabalho.id,
          pessoaId,
        }));
        await prisma.membroTrabalho.createMany({
          data: membrosData,
          skipDuplicates: true,
        });
      }

      return trabalho;
    });
  }

  async findAll() {
    return this.prisma.trabalho.findMany({
      include: {
        pessoa: true,
        membros: {
          include: { pessoa: true },
        },
        recebimentos: {
          include: { pessoa: true },
          orderBy: { id: 'asc' },
        },
        despesas: true,
        conta: true,
        lotesRateio: {
          include: { transacoes: true, recebimentos: true }
        }
      },
      orderBy: { dataTrabalho: 'desc' },
    });
  }

  async findOne(id: number) {
    const trabalho = await this.prisma.trabalho.findUnique({
      where: { id },
      include: {
        pessoa: true,
        membros: {
          include: { pessoa: true },
        },
        recebimentos: {
          include: { pessoa: true },
          orderBy: { id: 'asc' },
        },
        despesas: true,
        conta: true,
        lotesRateio: {
          include: { transacoes: true, recebimentos: true }
        }
      },
    });

    if (!trabalho) throw new NotFoundException('Trabalho não encontrado');
    return trabalho;
  }

  async update(id: number, updateTrabalhoDto: UpdateTrabalhoDto) {
    const trabalhoExistente = await this.findOne(id);
    const { membrosIds, dataTrabalho, status, ...dados } = updateTrabalhoDto;

    if (status === 'CONCLUIDO') {
      const temPendencia = trabalhoExistente.recebimentos.some((r: any) => r.status === 'PENDENTE');
      const temRateioPendente = trabalhoExistente.recebimentos.some((r: any) => r.status === 'PAGO' && r.loteRateioId === null);

      if (temPendencia || temRateioPendente) {
        throw new BadRequestException('Não é possível fechar o trabalho com recebimentos pendentes ou sem rateio executado.');
      }
    }

    const data: any = { ...dados, status };
    if (dataTrabalho) {
      data.dataTrabalho = new Date(dataTrabalho);
    }

    return this.prisma.$transaction(async (prisma) => {
      const trabalho = await prisma.trabalho.update({
        where: { id },
        data,
      });

      if (membrosIds !== undefined) {
        // Remove atuais
        await prisma.membroTrabalho.deleteMany({
          where: { trabalhoId: id },
        });

        // Adiciona novos
        if (membrosIds.length > 0) {
          const membrosData = membrosIds.map((pessoaId) => ({
            trabalhoId: id,
            pessoaId,
          }));
          await prisma.membroTrabalho.createMany({
            data: membrosData,
            skipDuplicates: true,
          });
        }
      }

      return trabalho;
    });
  }

  async remove(id: number) {
    const trabalhoExistente = await this.findOne(id);
    if (trabalhoExistente.lotesRateio && trabalhoExistente.lotesRateio.length > 0) {
      throw new BadRequestException('Não é possível excluir um trabalho que já possui lotes de rateio executados.');
    }
    if (trabalhoExistente.status !== 'ABERTO') {
      throw new BadRequestException('Apenas trabalhos com status ABERTO podem ser excluídos.');
    }
    return this.prisma.trabalho.delete({ where: { id } });
  }

  async addRecebimento(id: number, dto: AddRecebimentoDto) {
    await this.findOne(id);

    return this.prisma.recebimentoTrabalho.create({
      data: {
        trabalhoId: id,
        ...dto,
      },
    });
  }

  async updateRecebimento(trabalhoId: number, recId: number, dto: UpdateRecebimentoDto) {
    const recebimento = await this.prisma.recebimentoTrabalho.findUnique({
      where: { id: recId },
    });

    if (!recebimento || recebimento.trabalhoId !== trabalhoId) {
      throw new NotFoundException('Recebimento não encontrado.');
    }

    if (recebimento.loteRateioId !== null) {
      throw new BadRequestException('Não é possível editar um recebimento que já foi rateado.');
    }

    return this.prisma.recebimentoTrabalho.update({
      where: { id: recId },
      data: dto,
    });
  }

  async removeRecebimento(trabalhoId: number, recId: number) {
    const recebimento = await this.prisma.recebimentoTrabalho.findUnique({
      where: { id: recId },
    });

    if (!recebimento || recebimento.trabalhoId !== trabalhoId) {
      throw new NotFoundException('Recebimento não encontrado.');
    }

    if (recebimento.loteRateioId !== null) {
      throw new BadRequestException('Não é possível excluir um recebimento que já foi rateado.');
    }

    return this.prisma.recebimentoTrabalho.delete({
      where: { id: recId },
    });
  }

  async executarRateio(id: number) {
    const trabalho = await this.findOne(id);
    if (!trabalho.contaId) {
      throw new BadRequestException(
        'Não é possível processar o rateio. O administrador precisa associar uma Conta Financeira a este Trabalho primeiro.'
      );
    }
    const dataFormatada = new Date(trabalho.dataTrabalho).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    // Buscar todos os recebimentos pagos que não pertencem a nenhum lote de rateio
    const recebimentosPendentesRateio = trabalho.recebimentos.filter(
      (r) => r.status === 'PAGO' && r.loteRateioId === null
    );

    if (recebimentosPendentesRateio.length === 0) {
      throw new BadRequestException('Nenhum recebimento PAGO aguardando rateio.');
    }

    // Calcular totais
    const valorArrecadado = recebimentosPendentesRateio.reduce((acc, r) => acc + r.valor, 0);
    
    // As despesas acumuladas do trabalho que ainda não foram abatidas em lotes anteriores
    const totalDespesasTrabalho = trabalho.tipo === 'GRUPO' ? 
      trabalho.despesas.reduce((acc, d) => acc + d.valor, 0) : 0;
    
    const despesasJaAbatidas = trabalho.lotesRateio.reduce((acc, l) => acc + l.valorDespesas, 0);
    const valorDespesasPendente = Math.max(0, totalDespesasTrabalho - despesasJaAbatidas);

    if (trabalho.tipo === 'GRUPO' && valorDespesasPendente > valorArrecadado) {
      throw new BadRequestException(
        `O valor das despesas pendentes (R$ ${valorDespesasPendente.toFixed(2)}) é maior do que o valor arrecadado (R$ ${valorArrecadado.toFixed(2)}). Lançamentos insuficientes.`
      );
    }

    const valorDespesasLote = trabalho.tipo === 'GRUPO' ? valorDespesasPendente : 0;
    const valorLiquidoLote = valorArrecadado - valorDespesasLote;

    let loteRateioId: number = 0;

    await this.prisma.$transaction(async (prisma) => {
      // 1. Criar o Lote de Rateio
      const lote = await prisma.loteRateio.create({
        data: {
          trabalhoId: id,
          valorArrecadado,
          valorDespesas: valorDespesasLote,
          valorLiquido: valorLiquidoLote,
        }
      });
      loteRateioId = lote.id;

      // 2. Vincular os recebimentos ao lote
      await prisma.recebimentoTrabalho.updateMany({
        where: { id: { in: recebimentosPendentesRateio.map(r => r.id) } },
        data: { loteRateioId: lote.id }
      });

      // 3. Processar e agrupar transações financeiras por método
      const recebimentosPorMetodo: { [metodo: string]: typeof recebimentosPendentesRateio } = {};
      for (const rec of recebimentosPendentesRateio) {
        const metodo = rec.metodo || 'OUTROS';
        if (!recebimentosPorMetodo[metodo]) {
          recebimentosPorMetodo[metodo] = [];
        }
        recebimentosPorMetodo[metodo].push(rec);
      }

      for (const [metodo, recs] of Object.entries(recebimentosPorMetodo)) {
        const valorMetodo = recs.reduce((acc, r) => acc + r.valor, 0);
        
        // Despesa proporcional a este método no lote
        const proporcaoMetodo = valorMetodo / valorArrecadado;
        const despesaProporcionalMetodo = valorDespesasLote * proporcaoMetodo;
        const liquidoProporcionalMetodo = valorMetodo - despesaProporcionalMetodo;

        if (trabalho.tipo === 'INDIVIDUAL') {
          // No individual, agrupamos por pessoa e por método
          const recsPorPessoa: { [pessoaId: number]: number } = {};
          for (const r of recs) {
            if (!r.pessoaId) {
              throw new BadRequestException('Recebimento de trabalho individual sem pessoa vinculada.');
            }
            recsPorPessoa[r.pessoaId] = (recsPorPessoa[r.pessoaId] || 0) + r.valor;
          }

          let totalComunidadeMetodo = 0;

          for (const [pessoaIdStr, valorPessoa] of Object.entries(recsPorPessoa)) {
            const pessoaId = Number(pessoaIdStr);
            const valorTrabalhadorPessoa = valorPessoa * (trabalho.proporcao / 100);
            const valorComunidadePessoa = valorPessoa - valorTrabalhadorPessoa;
            totalComunidadeMetodo += valorComunidadePessoa;

            if (valorTrabalhadorPessoa > 0) {
              await prisma.transacao.create({
                data: {
                  valor: valorTrabalhadorPessoa,
                  tipo: 'RECEITA',
                  origem: 'TRABALHO',
                  descricao: `Repasse Trabalho (${trabalho.descricao}) - Lote #${lote.id}`,
                  metodo,
                  pessoaId,
                  loteRateioId: lote.id,
                  data: new Date()
                }
              });
            }
          }

          if (totalComunidadeMetodo > 0) {
            await prisma.transacao.create({
              data: {
                valor: totalComunidadeMetodo,
                tipo: 'RECEITA',
                origem: 'TRABALHO',
                descricao: `Comunidade Trabalho (${trabalho.descricao}) - Lote #${lote.id}`,
                metodo,
                contaId: trabalho.contaId,
                loteRateioId: lote.id,
                data: new Date()
              }
            });
          }

        } else {
          // GRUPO
          // 1. Transação de reembolso/comunidade para a despesa
          if (despesaProporcionalMetodo > 0) {
            await prisma.transacao.create({
              data: {
                valor: despesaProporcionalMetodo,
                tipo: 'RECEITA',
                origem: 'TRABALHO',
                descricao: `Reembolso Despesas (${trabalho.descricao} ${dataFormatada}) - Lote #${lote.id}`,
                metodo,
                contaId: trabalho.contaId,
                loteRateioId: lote.id,
                data: new Date()
              }
            });
          }

          // 2. Transações dos trabalhadores do grupo
          if (liquidoProporcionalMetodo > 0) {
            if (trabalho.membros.length === 0) {
              throw new BadRequestException('Trabalho em grupo sem membros vinculados.');
            }
            const valorPorMembro = liquidoProporcionalMetodo / trabalho.membros.length;
            for (const membro of trabalho.membros) {
              await prisma.transacao.create({
                data: {
                  valor: valorPorMembro,
                  tipo: 'RECEITA',
                  origem: 'TRABALHO',
                  descricao: `Repasse Grupo (${trabalho.descricao}) - Lote #${lote.id}`,
                  metodo,
                  pessoaId: membro.pessoaId,
                  loteRateioId: lote.id,
                  data: new Date()
                }
              });
            }
          }
        }
      }
    });

    return {
      message: 'Rateio por lote processado com sucesso',
      loteRateioId,
      recebimentosProcessados: recebimentosPendentesRateio.length,
      valorArrecadado,
      valorDespesas: valorDespesasLote,
      valorLiquido: valorLiquidoLote
    };
  }

  async addDespesa(id: number, data: { valor: number; descricao: string }) {
    await this.findOne(id);
    return this.prisma.despesaTrabalho.create({
      data: {
        valor: data.valor,
        descricao: data.descricao,
        trabalhoId: id
      }
    });
  }

  async removeDespesa(despesaId: number) {
    return this.prisma.despesaTrabalho.delete({ where: { id: despesaId } });
  }

  async removeLoteRateio(trabalhoId: number, loteId: number) {
    const trabalho = await this.findOne(trabalhoId);
    if (trabalho.status === 'CONCLUIDO') {
      throw new BadRequestException('Não é possível cancelar rateios de um trabalho já concluído.');
    }
    
    const result = await this.prisma.loteRateio.delete({
      where: { id: loteId }
    });

    if (trabalho.contaId) {
      const transacoes = await this.prisma.transacao.findMany({
        where: { contaId: trabalho.contaId }
      });
      const saldo = transacoes.reduce((acc: number, t: any) => {
        return t.tipo === 'RECEITA' ? acc + t.valor : acc - t.valor;
      }, 0);
      await this.prisma.conta.update({
        where: { id: trabalho.contaId },
        data: { saldo }
      });
    }

    return result;
  }
}
