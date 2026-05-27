import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLancamentoExtratoDto } from './dto/create-lancamento-extrato.dto';

@Injectable()
export class LancamentosExtratoService {
  constructor(private readonly prisma: PrismaService) {}

  async criarLote(dtos: CreateLancamentoExtratoDto[]) {
    const data = dtos.map(dto => ({
      data: new Date(dto.data),
      descricao: dto.descricao,
      valor: dto.valor,
      tipo: dto.tipo,
      metodo: dto.metodo || null,
      contaId: dto.contaId,
      conciliado: false
    }));

    return this.prisma.lancamentoExtrato.createMany({
      data
    });
  }

  async buscarPorConta(contaId: number) {
    return this.prisma.lancamentoExtrato.findMany({
      where: { contaId },
      orderBy: { data: 'desc' }
    });
  }
}
