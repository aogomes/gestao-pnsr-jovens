import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

@Injectable()
export class EventosService {
  constructor(private prisma: PrismaService) {}

  async criar(createEventoDto: CreateEventoDto) {
    return this.prisma.evento.create({
      data: {
        ...createEventoDto,
        dataInicio: new Date(createEventoDto.dataInicio),
        dataFim: new Date(createEventoDto.dataFim),
        limiteInscricao: new Date(createEventoDto.limiteInscricao),
        dataIdaEstimada: createEventoDto.dataIdaEstimada ? new Date(createEventoDto.dataIdaEstimada) : null,
        dataRetornoEstimada: createEventoDto.dataRetornoEstimada ? new Date(createEventoDto.dataRetornoEstimada) : null,
        dataLimiteSinal: createEventoDto.dataLimiteSinal ? new Date(createEventoDto.dataLimiteSinal) : null,
      },
    });
  }

  buscarTodos() {
    return this.prisma.evento.findMany({
      include: {
        paroquia: true,
        conta: true,
        _count: { select: { inscricoes: true } },
      },
    });
  }

  buscarAtivos() {
    return this.prisma.evento.findMany({
      where: { status: 'ATIVO' },
      include: {
        paroquia: true,
      },
    });
  }

  buscarUm(id: number) {
    return this.prisma.evento.findUnique({
      where: { id },
      include: {
        paroquia: true,
        conta: true,
        inscricoes: { include: { pessoa: true } },
      },
    });
  }

  async atualizar(id: number, updateEventoDto: UpdateEventoDto) {
    const dados: any = { ...updateEventoDto };
    if (dados.dataInicio) dados.dataInicio = new Date(dados.dataInicio);
    if (dados.dataFim) dados.dataFim = new Date(dados.dataFim);
    if (dados.limiteInscricao) dados.limiteInscricao = new Date(dados.limiteInscricao);
    if (dados.dataIdaEstimada) dados.dataIdaEstimada = new Date(dados.dataIdaEstimada);
    if (dados.dataRetornoEstimada) dados.dataRetornoEstimada = new Date(dados.dataRetornoEstimada);
    if (dados.dataLimiteSinal) dados.dataLimiteSinal = new Date(dados.dataLimiteSinal);
    return this.prisma.evento.update({ where: { id }, data: dados });
  }

  remover(id: number) {
    return this.prisma.evento.delete({ where: { id } });
  }

  async buscarDespesasMembros(eventoId: number) {
    return this.prisma.transacao.findMany({
      where: {
        eventoId,
        tipo: 'DESPESA',
        pessoaId: { not: null }
      },
      orderBy: { data: 'desc' }
    });
  }
}

