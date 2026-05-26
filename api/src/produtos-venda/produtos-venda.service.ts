import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProdutoVendaDto } from './dto/create-produto-venda.dto';
import { UpdateProdutoVendaDto } from './dto/update-produto-venda.dto';

@Injectable()
export class ProdutosVendaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProdutoVendaDto) {
    return this.prisma.produtoVenda.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.produtoVenda.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: number) {
    const produto = await this.prisma.produtoVenda.findUnique({
      where: { id },
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    return produto;
  }

  async update(id: number, dto: UpdateProdutoVendaDto) {
    await this.findOne(id);
    return this.prisma.produtoVenda.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    const produto = await this.prisma.produtoVenda.findUnique({
      where: { id },
      include: {
        itensVenda: { take: 1 },
      },
    });

    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (produto.itensVenda.length > 0) {
      throw new BadRequestException(
        'Este produto já possui histórico de vendas registradas e não pode ser excluído. Para retirá-lo de circulação, desative-o nas configurações do produto.'
      );
    }

    return this.prisma.produtoVenda.delete({
      where: { id },
    });
  }
}
