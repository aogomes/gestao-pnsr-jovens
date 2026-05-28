import { Injectable, NotFoundException } from '@nestjs/common';
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

    return this.prisma.saque.create({
      data: {
        ...rest,
        data: data ? new Date(data) : undefined,
      },
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
    });
    if (!saque) {
      throw new NotFoundException(`Saque com ID ${id} não encontrado`);
    }

    return this.prisma.saque.delete({
      where: { id },
    });
  }
}
