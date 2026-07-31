import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(createPessoaDto: CreatePessoaDto, user: any) {
    const dados: any = { 
      ...createPessoaDto,
      paroquiaId: ['ADMIN', 'AUDITOR'].includes(user.papel) ? (createPessoaDto.paroquiaId || user.paroquiaId) : user.paroquiaId
    };
    if (dados.email === '') dados.email = null;
    if (dados.dataNascimento === '') dados.dataNascimento = null;
    else if (dados.dataNascimento) dados.dataNascimento = new Date(dados.dataNascimento);

    return this.prisma.$transaction(async (prisma) => {
      const pessoa = await prisma.pessoa.create({ data: dados });

      if (dados.email) {
        // Verifica se o usuário já existe
        const usuarioExistente = await prisma.usuario.findUnique({
          where: { login: dados.email },
        });

        if (!usuarioExistente) {
          const salt = await bcrypt.genSalt();
          const senhaCriptografada = await bcrypt.hash('portal', salt);

          await prisma.usuario.create({
            data: {
              login: dados.email,
              senha: senhaCriptografada,
              papel: 'USUARIO',
              pessoaId: pessoa.id,
            },
          });
        }
      }

      return pessoa;
    });
  }

  obterSaldosPorEvento(transacoes: any[]) {
    const eventosMap: Record<number, { id: number, nome: string, receitas: number, despesas: number }> = {};
    
    transacoes.forEach((t: any) => {
      if (!t.eventoId) return;
      if (t.evento && t.evento.status !== 'ATIVO') return;
      if (!eventosMap[t.eventoId]) {
        eventosMap[t.eventoId] = { id: t.eventoId, nome: t.evento?.nome || `Evento #${t.eventoId}`, receitas: 0, despesas: 0 };
      }
      if (t.tipo === 'RECEITA') eventosMap[t.eventoId].receitas += t.valor;
      if (t.tipo === 'DESPESA') eventosMap[t.eventoId].despesas += t.valor;
    });

    return Object.values(eventosMap).map((ev: any) => ({
      eventoId: ev.id,
      nomeEvento: ev.nome,
      saldo: Number(Number(ev.receitas - ev.despesas).toFixed(2)) || 0
    }));
  }

  async calcularSaldoPorEvento(pessoaId: number, eventoId: number): Promise<number> {
    const transacoes = await this.prisma.transacao.findMany({
      where: { pessoaId, eventoId }
    });
    const totalTransacoes = transacoes.reduce((acc: number, t: any) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0);

    return Number(Number(totalTransacoes).toFixed(2)) || 0;
  }

  async buscarTodas(user: any) {
    const where = ['ADMIN', 'AUDITOR'].includes(user.papel) ? { ativo: true } : { paroquiaId: user.paroquiaId, ativo: true };
    const pessoas = await this.prisma.pessoa.findMany({
      where,
      include: { 
        paroquia: true
      },
      orderBy: { nome: 'asc' }
    });

    if (pessoas.length === 0) return [];
    
    const pessoaIds = pessoas.map(p => p.id);
    
    const eventosAtivosInfo = await this.prisma.evento.findMany({ where: { status: 'ATIVO' }, select: { id: true, nome: true } });
    const ativosIds = eventosAtivosInfo.map(e => e.id);
    const nomeEventosMap = eventosAtivosInfo.reduce((acc, ev) => ({ ...acc, [ev.id]: ev.nome }), {} as Record<number, string>);

    const saldosGerais = await this.prisma.transacao.groupBy({
      by: ['pessoaId', 'tipo'],
      where: { 
        pessoaId: { in: pessoaIds },
        OR: [
          { eventoId: { in: ativosIds } },
          { eventoId: null }
        ]
      },
      _sum: { valor: true }
    });

    const saldosMap: Record<number, number> = {};
    pessoaIds.forEach(id => { saldosMap[id] = 0; });

    saldosGerais.forEach(t => {
      if (t.pessoaId !== null) {
        if (t.tipo === 'RECEITA') saldosMap[t.pessoaId] += (t._sum.valor || 0);
        if (t.tipo === 'DESPESA') saldosMap[t.pessoaId] -= (t._sum.valor || 0);
      }
    });

    const saldosEventos = await this.prisma.transacao.groupBy({
      by: ['pessoaId', 'eventoId', 'tipo'],
      where: { pessoaId: { in: pessoaIds }, eventoId: { in: ativosIds } },
      _sum: { valor: true }
    });

    const saldosDetalhadosMap: Record<number, any[]> = {};
    pessoaIds.forEach(id => { saldosDetalhadosMap[id] = []; });

    const agregacaoPorEvento: Record<string, { receitas: number, despesas: number }> = {};
    saldosEventos.forEach(t => {
      if (t.pessoaId !== null && t.eventoId !== null) {
        const key = `${t.pessoaId}-${t.eventoId}`;
        if (!agregacaoPorEvento[key]) agregacaoPorEvento[key] = { receitas: 0, despesas: 0 };
        if (t.tipo === 'RECEITA') agregacaoPorEvento[key].receitas += (t._sum.valor || 0);
        if (t.tipo === 'DESPESA') agregacaoPorEvento[key].despesas += (t._sum.valor || 0);
      }
    });

    Object.keys(agregacaoPorEvento).forEach(key => {
      const [pessoaIdStr, eventoIdStr] = key.split('-');
      const pId = Number(pessoaIdStr);
      const evId = Number(eventoIdStr);
      const data = agregacaoPorEvento[key];
      saldosDetalhadosMap[pId].push({
        eventoId: evId,
        nomeEvento: nomeEventosMap[evId] || `Evento #${evId}`,
        saldo: Number(Number(data.receitas - data.despesas).toFixed(2)) || 0
      });
    });

    return pessoas.map((p: any) => {
      const saldoCalculado = Number(Number(saldosMap[p.id]).toFixed(2)) || 0;
      return { ...p, saldo: saldoCalculado, saldos: saldosDetalhadosMap[p.id] };
    });
  }

  async buscarUma(id: number) {
    const pessoa = await this.prisma.pessoa.findUnique({ 
      where: { id },
      include: { 
        transacoes: {
          include: { evento: true },
          orderBy: { data: 'desc' }
        }
      }
    });
    if (!pessoa) {
      throw new NotFoundException(`Pessoa com ID ${id} não encontrada.`);
    }
    if ((pessoa as any).transacoes) {
      (pessoa as any).transacoes = (pessoa as any).transacoes.filter((t: any) => !(t.evento && t.evento.status !== 'ATIVO'));
    }
    const totalTransacoes = (pessoa as any).transacoes.reduce((acc: number, t: any) => {
        if (t.tipo === 'RECEITA') return acc + t.valor;
        if (t.tipo === 'DESPESA') return acc - t.valor;
        return acc;
    }, 0);
    const saldoCalculado = Number(Number(totalTransacoes).toFixed(2)) || 0;
    const saldosDetalhados = this.obterSaldosPorEvento((pessoa as any).transacoes);
    return { ...pessoa, saldo: saldoCalculado, saldos: saldosDetalhados };
  }

  async buscarMeuPerfil(identificador: string) {
    if (!identificador) {
      throw new NotFoundException('Perfil não identificado.');
    }
    const isNumeric = !isNaN(Number(identificador));
    const where: any = isNumeric 
      ? { OR: [{ id: Number(identificador) }, { email: String(identificador) }] }
      : { email: String(identificador) };

    const pessoa = await this.prisma.pessoa.findFirst({
      where,
      include: {
        inscricoes: {
          include: {
            evento: true,
            transacoes: true
          }
        },
        transacoes: {
          include: { evento: true },
          orderBy: { data: 'desc' }
        }
      }
    });

    if (!pessoa) {
      throw new NotFoundException('Perfil não encontrado para o identificador informado.');
    }

    if ((pessoa as any).transacoes) {
      (pessoa as any).transacoes = (pessoa as any).transacoes.filter((t: any) => !(t.evento && t.evento.status !== 'ATIVO'));
    }
    const totalTransacoes = (pessoa as any).transacoes.reduce((acc: number, t: any) => {
        if (t.tipo === 'RECEITA') return acc + t.valor;
        if (t.tipo === 'DESPESA') return acc - t.valor;
        return acc;
    }, 0);
    const saldoCalculado = Number(Number(totalTransacoes).toFixed(2)) || 0;
    const saldosDetalhados = this.obterSaldosPorEvento((pessoa as any).transacoes);

    const inscricoesFormatadas = (pessoa.inscricoes || []).map((insc: any) => {
      const pagamentosSintetizados = (insc.transacoes || [])
        .filter((t: any) => t.pessoaId === pessoa.id)
        .map((t: any) => ({
          id: t.id,
          valor: t.tipo === 'DESPESA' ? t.valor : -t.valor,
          data: t.data,
          metodo: t.metodo || 'SALDO',
          observacao: t.descricao
        }));
      
      const { transacoes, ...inscSemTransacoes } = insc;
      return {
        ...inscSemTransacoes,
        pagamentos: pagamentosSintetizados
      };
    });

    return { ...pessoa, inscricoes: inscricoesFormatadas, saldo: saldoCalculado, saldos: saldosDetalhados };
  }

  async atualizar(id: number, updatePessoaDto: UpdatePessoaDto) {
    await this.buscarUma(id);
    const dados: any = { ...updatePessoaDto };
    
    // Proteção contra valores nulos ou vazios em campos obrigatórios
    if (dados.nome === '' || dados.nome === null) {
      delete dados.nome; // Não atualiza o nome se for vazio ou nulo
    }
    
    if (dados.perfis === null) {
      dados.perfis = []; // Garante que perfis seja um array vazio se vier nulo
    }

    if (dados.email === '') dados.email = null;
    
    if (dados.dataNascimento === '') {
      dados.dataNascimento = null;
    } else if (dados.dataNascimento) {
      const data = new Date(dados.dataNascimento);
      if (isNaN(data.getTime())) {
        delete dados.dataNascimento; // Remove se a data for inválida
      } else {
        dados.dataNascimento = data;
      }
    }

    return this.prisma.$transaction(async (prisma) => {
      const pessoaAtualizada = await prisma.pessoa.update({ where: { id }, data: dados });

      if (dados.email) {
        const usuarioVinculado = await prisma.usuario.findUnique({
          where: { pessoaId: id }
        });

        if (usuarioVinculado) {
          await prisma.usuario.update({
            where: { id: usuarioVinculado.id },
            data: { login: dados.email }
          });
        }
      }

      return pessoaAtualizada;
    });
  }

  async remover(id: number) {
    await this.buscarUma(id);
    return this.prisma.$transaction(async (tx) => {
      // 1. Deletar usuário associado para impedir novos logins
      await tx.usuario.deleteMany({ where: { pessoaId: id } });

      // 2. Marcar a pessoa como inativa (Soft-Delete)
      return tx.pessoa.update({
        where: { id },
        data: { ativo: false }
      });
    });
  }
}

