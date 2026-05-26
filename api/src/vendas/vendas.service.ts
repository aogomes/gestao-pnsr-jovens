import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendaDto } from './dto/create-venda.dto';
import { StatusRecebimentoTrabalho } from '@prisma/client';

@Injectable()
export class VendasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVendaDto) {
    const { trabalhoId, itens, descricao, metodoPagamento, statusPagamento } = dto;

    // Verificar se o trabalho existe
    const trabalho = await this.prisma.trabalho.findUnique({
      where: { id: trabalhoId },
    });
    if (!trabalho) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    if (trabalho.status !== 'ABERTO') {
      throw new BadRequestException('Não é possível adicionar vendas a um turno de trabalho que já foi fechado ou concluído.');
    }

    if (itens.length === 0) {
      throw new BadRequestException('A venda deve conter pelo menos um produto.');
    }

    // Buscar todos os produtos informados para validar e obter os preços unitários
    const produtosIds = itens.map((item) => item.produtoId);
    const produtosDb = await this.prisma.produtoVenda.findMany({
      where: { id: { in: produtosIds } },
    });

    if (produtosDb.length !== Array.from(new Set(produtosIds)).length) {
      throw new BadRequestException('Um ou mais produtos informados não foram encontrados.');
    }

    const mapProdutos = new Map(produtosDb.map((p) => [p.id, p]));

    // Calcular valores e montar itens para inserção
    let valorTotalVenda = 0;
    const itensVendaData: any[] = [];

    for (const item of itens) {
      const produto = mapProdutos.get(item.produtoId);
      if (!produto) continue;
      
      if (!produto.ativo) {
        throw new BadRequestException(`O produto "${produto.nome}" está desativado e não pode ser vendido.`);
      }

      const valorUnitario = produto.valor;
      const valorTotalItem = valorUnitario * item.quantidade;

      valorTotalVenda += valorTotalItem;
      itensVendaData.push({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        valorUnitario,
        valorTotal: valorTotalItem,
      });
    }

    // Cria a venda e o recebimento de forma síncrona/atômica em tempo real
    return this.prisma.$transaction(async (prisma) => {
      // 1. Criar o RecebimentoTrabalho para a venda individualmente
      const recebimento = await prisma.recebimentoTrabalho.create({
        data: {
          trabalhoId,
          valor: valorTotalVenda,
          descricao: (descricao?.toUpperCase() || 'VENDA GERAL').trim(),
          metodo: metodoPagamento.toUpperCase(),
          status: statusPagamento.toUpperCase() as StatusRecebimentoTrabalho,
        },
      });

      // 2. Criar a Venda vinculada a este recebimento
      return prisma.venda.create({
        data: {
          descricao: descricao?.toUpperCase() || 'S/ IDENTIFICAÇÃO',
          valorTotal: valorTotalVenda,
          metodoPagamento: metodoPagamento.toUpperCase(),
          statusPagamento: statusPagamento.toUpperCase(),
          trabalhoId,
          recebimentoId: recebimento.id,
          itens: {
            createMany: {
              data: itensVendaData,
            },
          },
        },
        include: {
          itens: {
            include: { produto: true },
          },
        },
      });
    });
  }

  async findByTrabalho(trabalhoId: number) {
    return this.prisma.venda.findMany({
      where: { trabalhoId },
      include: {
        itens: {
          include: { produto: true },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async update(id: number, dto: CreateVendaDto) {
    const { trabalhoId, itens, descricao, metodoPagamento, statusPagamento } = dto;

    const vendaExistente = await this.prisma.venda.findUnique({
      where: { id },
      include: { trabalho: true },
    });

    if (!vendaExistente) {
      throw new NotFoundException('Venda não encontrada');
    }

    const trabalho = await this.prisma.trabalho.findUnique({
      where: { id: trabalhoId },
    });
    if (!trabalho) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    if (trabalho.status !== 'ABERTO') {
      throw new BadRequestException('Não é possível editar vendas de um turno que já foi fechado ou concluído.');
    }

    if (itens.length === 0) {
      throw new BadRequestException('A venda deve conter pelo menos um produto.');
    }

    const produtosIds = itens.map((item) => item.produtoId);
    const produtosDb = await this.prisma.produtoVenda.findMany({
      where: { id: { in: produtosIds } },
    });

    if (produtosDb.length !== Array.from(new Set(produtosIds)).length) {
      throw new BadRequestException('Um ou mais produtos informados não foram encontrados.');
    }

    const mapProdutos = new Map(produtosDb.map((p) => [p.id, p]));

    let valorTotalVenda = 0;
    const itensVendaData: any[] = [];

    for (const item of itens) {
      const produto = mapProdutos.get(item.produtoId);
      if (!produto) continue;
      
      const valorUnitario = produto.valor;
      const valorTotalItem = valorUnitario * item.quantidade;

      valorTotalVenda += valorTotalItem;
      itensVendaData.push({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        valorUnitario,
        valorTotal: valorTotalItem,
      });
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Limpar itens antigos
      await prisma.itemVenda.deleteMany({
        where: { vendaId: id },
      });

      // 2. Atualizar o cabeçalho da Venda e criar novos itens
      const venda = await prisma.venda.update({
        where: { id },
        data: {
          descricao: descricao?.toUpperCase() || 'S/ IDENTIFICAÇÃO',
          valorTotal: valorTotalVenda,
          metodoPagamento: metodoPagamento.toUpperCase(),
          statusPagamento: statusPagamento.toUpperCase(),
          itens: {
            createMany: {
              data: itensVendaData,
            },
          },
        },
        include: {
          itens: {
            include: { produto: true },
          },
        },
      });

      // 3. Atualizar o RecebimentoTrabalho correspondente em tempo real
      if (venda.recebimentoId) {
        await prisma.recebimentoTrabalho.update({
          where: { id: venda.recebimentoId },
          data: {
            valor: valorTotalVenda,
            descricao: (descricao?.toUpperCase() || 'VENDA GERAL').trim(),
            metodo: metodoPagamento.toUpperCase(),
            status: statusPagamento.toUpperCase() as StatusRecebimentoTrabalho,
          },
        });
      }

      return venda;
    });
  }

  async remove(id: number) {
    const venda = await this.prisma.venda.findUnique({
      where: { id },
      include: { trabalho: true },
    });

    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (venda.trabalho.status !== 'ABERTO') {
      throw new BadRequestException('Não é possível excluir vendas de um turno que já foi fechado ou concluído.');
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Excluir a venda (os itens de venda serão excluídos automaticamente por Cascade)
      const deletedVenda = await prisma.venda.delete({
        where: { id },
      });

      // 2. Excluir o RecebimentoTrabalho correspondente em tempo real
      if (venda.recebimentoId) {
        await prisma.recebimentoTrabalho.delete({
          where: { id: venda.recebimentoId },
        });
      }

      return deletedVenda;
    });
  }

  async fecharTurno(trabalhoId: number) {
    const trabalho = await this.prisma.trabalho.findUnique({
      where: { id: trabalhoId },
    });

    if (!trabalho) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    if (trabalho.status !== 'ABERTO') {
      throw new BadRequestException('Apenas turnos em aberto podem ser fechados.');
    }

    // Como os recebimentos já são criados individualmente em tempo real no ato da venda,
    // apenas atualizamos o status do Trabalho para EM_ANDAMENTO.
    return this.prisma.trabalho.update({
      where: { id: trabalhoId },
      data: { status: 'EM_ANDAMENTO' },
    });
  }


  async configurarProdutos(trabalhoId: number, produtosIds: number[]) {
    return this.prisma.$transaction(async (prisma) => {
      // Remover associações existentes
      await prisma.trabalhoProduto.deleteMany({
        where: { trabalhoId },
      });

      // Criar novas associações
      if (produtosIds.length > 0) {
        const data = produtosIds.map((produtoId) => ({
          trabalhoId,
          produtoId,
        }));
        await prisma.trabalhoProduto.createMany({
          data,
        });
      }

      return { success: true };
    });
  }

  async obterProdutosConfigurados(trabalhoId: number) {
    const trabalhoProdutos = await this.prisma.trabalhoProduto.findMany({
      where: { trabalhoId },
      include: { produto: true },
    });
    return trabalhoProdutos.map((tp) => tp.produto);
  }
}
