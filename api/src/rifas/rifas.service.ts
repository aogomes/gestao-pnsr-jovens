import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRifaDto } from './dto/create-rifa.dto';
import { AlocarRifaDto } from './dto/alocar-rifa.dto';
import { UpdateBilheteDto } from './dto/update-bilhete.dto';
import { UpdateBilheteBulkDto } from './dto/update-bilhete-bulk.dto';

@Injectable()
export class RifasService {
  constructor(private prisma: PrismaService) {}

  async criar(createRifaDto: CreateRifaDto, user: any) {
    const { premios, eventoId, ...dadosRifa } = createRifaDto;

    return this.prisma.$transaction(async (tx) => {
      try {
        const rifa = await tx.rifa.create({
          data: {
            ...dadosRifa,
            eventoId: eventoId,
            chavePix: createRifaDto.chavePix || null,
            tipoChavePix: createRifaDto.tipoChavePix || null,
            premios: {
              create: premios
            }
          }
        });

        // Gerar todos os bilhetes da rifa como LIVRE
        const bilhetesData: any[] = [];
        for (let i = 1; i <= rifa.totalNumeros; i++) {
          bilhetesData.push({
            numero: i,
            rifaId: rifa.id,
            status: 'LIVRE' as any
          });
        }

        await tx.bilhete.createMany({
          data: bilhetesData
        });

        return rifa;
      } catch (err) {
        console.error('ERRO AO CRIAR RIFA:', err);
        throw err;
      }
    });
  }

  async listarTodas(user: any) {
    let where: any = {};
    
    if (user.papel !== 'ADMIN') {
      if (user.paroquiaId) {
        where = { evento: { paroquiaId: user.paroquiaId } };
      } else {
        // Se for um usuário comum sem paróquia vinculada, não deve ver rifas restritas
        return [];
      }
    }

    const rifas = await this.prisma.rifa.findMany({
      where,
      include: {
        premios: true,
        evento: {
          include: { paroquia: true, conta: true }
        },
        alocacoes: {
          include: { pessoa: true }
        },
        _count: {
          select: { bilhetes: true }
        }
      },
      orderBy: { criadoEm: 'desc' }
    });

    // Adicionar contagens por status manualmente (Prisma não suporta counts filtrados dentro do findMany include nativo facilmente)
    return Promise.all(rifas.map(async (rifa) => {
      const [livres, reservados, vendidos] = await Promise.all([
        this.prisma.bilhete.count({ where: { rifaId: rifa.id, status: 'LIVRE' } }),
        this.prisma.bilhete.count({ where: { rifaId: rifa.id, status: 'RESERVADO' } }),
        this.prisma.bilhete.count({ where: { rifaId: rifa.id, status: 'VENDIDO' } }),
      ]);

      return {
        ...rifa,
        stats: { livres, reservados, vendidos }
      };
    }));
  }

  async buscarUma(id: number, user: any) {
    const rifa = await this.prisma.rifa.findUnique({
      where: { id },
      include: {
        premios: true,
        evento: {
          include: { paroquia: true, conta: true, inscricoes: { include: { pessoa: true } } }
        },
        alocacoes: {
          include: { pessoa: true }
        }
      }
    });
    if (!rifa) throw new NotFoundException('Rifa não encontrada');
    
    if (user.papel !== 'ADMIN' && rifa.evento?.paroquiaId !== user.paroquiaId) {
      throw new ForbiddenException('Acesso negado a esta rifa');
    }

    return rifa;
  }

  /**
   * Aloca um bloco de números (Cartela) para um vendedor
   */
  async alocarCartela(dto: AlocarRifaDto) {
    const { rifaId, pessoaId, quantidade } = dto;

    return this.prisma.$transaction(async (tx) => {
      const rifa = await tx.rifa.findUnique({ where: { id: rifaId } });
      if (!rifa) throw new NotFoundException('Rifa não encontrada');
      if (rifa.status === 'FINALIZADA' || rifa.status === 'SORTEADA') {
        throw new BadRequestException('Não é permitido alocar cartelas para uma campanha finalizada ou sorteada.');
      }

      // Validar trava de segurança: Apenas inscritos no evento da rifa podem participar
      const inscrito = await tx.inscricao.findUnique({
        where: { pessoaId_eventoId: { pessoaId, eventoId: rifa.eventoId } }
      });
      if (!inscrito) {
        throw new BadRequestException('Apenas pessoas inscritas no evento desta rifa podem ser alocadas.');
      }

      // 1. Validar trava de estoque: Se houver números LIVRE ou RESERVADO na alocação anterior, não permite nova
      const alocacaoAtiva = await tx.alocacaoRifa.findFirst({
        where: {
          rifaId,
          pessoaId,
          ativa: true
        }
      });

      if (alocacaoAtiva) {
        const pendentes = await tx.bilhete.count({
          where: {
            rifaId,
            vendedorId: pessoaId,
            numero: { gte: alocacaoAtiva.inicioRange, lte: alocacaoAtiva.fimRange },
            status: { in: ['LIVRE', 'RESERVADO'] as any }
          }
        });

        if (pendentes > 0) {
          throw new BadRequestException(`Você ainda possui ${pendentes} números pendentes na sua cartela atual. Liquide 100% para solicitar novos.`);
        }

        // Se chegou aqui, a cartela anterior foi 100% vendida. Desativa a alocação anterior.
        await tx.alocacaoRifa.update({
          where: { id: alocacaoAtiva.id },
          data: { ativa: false }
        });
      }

      // 2. Buscar o próximo intervalo disponível
      const ultimoBilheteAlocado = await tx.bilhete.findFirst({
        where: { rifaId, vendedorId: { not: null } },
        orderBy: { numero: 'desc' }
      });

      const inicio = ultimoBilheteAlocado ? ultimoBilheteAlocado.numero + 1 : 1;
      const fim = inicio + quantidade - 1;

      // Verificar se há números suficientes
      
      if (fim > rifa.totalNumeros) {
        throw new BadRequestException('Não há números disponíveis suficientes para esta quantidade.');
      }

      // 3. Criar a nova alocação
      const alocacao = await tx.alocacaoRifa.create({
        data: {
          rifaId,
          pessoaId,
          inicioRange: inicio,
          fimRange: fim,
          ativa: true
        }
      });

      // 4. Vincular os bilhetes ao vendedor
      await tx.bilhete.updateMany({
        where: {
          rifaId,
          numero: { gte: inicio, lte: fim }
        },
        data: {
          vendedorId: pessoaId
        }
      });

      return alocacao;
    });
  }

  async atualizarBilhete(bilheteId: number, dto: UpdateBilheteDto, vendedorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const bilhete = await tx.bilhete.findUnique({
        where: { id: bilheteId },
        include: { rifa: true, recebimento: true }
      });
      
      if (!bilhete) throw new NotFoundException('Bilhete não encontrado');
      if (bilhete.rifa.status === 'FINALIZADA' || bilhete.rifa.status === 'SORTEADA') {
        throw new BadRequestException('Não é permitido alterar bilhetes de uma campanha finalizada ou sorteada.');
      }
      if (bilhete.vendedorId !== vendedorId) throw new BadRequestException('Este bilhete não pertence à sua cartela.');

      if (bilhete.status === 'VENDIDO') {
        throw new BadRequestException('Este bilhete já está vendido e não pode ser alterado.');
      }

      if (dto.status === 'VENDIDO' && !dto.comprovante && !bilhete.recebimento?.comprovante) {
        throw new BadRequestException('É obrigatório anexar um comprovante para marcar como Vendido.');
      }

      // Se passou a ser VENDIDO, registrar o Recebimento do Bilhete intermediário (sem poluir a tabela de transações)
      let recebimentoId: number | null = null;
      if (dto.status === 'VENDIDO') {
        const recebimento = await tx.recebimentoRifa.create({
          data: {
            valor: bilhete.rifa.valorNumero,
            comprovante: dto.comprovante ?? bilhete.recebimento?.comprovante,
            metodo: 'PIX',
            nomeCliente: dto.nomeCliente ?? bilhete.recebimento?.nomeCliente,
            foneCliente: dto.foneCliente ?? bilhete.recebimento?.foneCliente,
            rifaId: bilhete.rifaId,
            vendedorId: vendedorId,
            dataRecebimento: new Date()
          }
        });
        recebimentoId = recebimento.id;
      }

      const bilheteAtualizado = await tx.bilhete.update({
        where: { id: bilheteId },
        data: {
          status: dto.status,
          dataVenda: dto.status === 'VENDIDO' ? new Date() : null,
          recebimentoId: dto.status === 'LIVRE' ? null : (recebimentoId ?? bilhete.recebimentoId)
        },
        include: { recebimento: true }
      });

      // Mapeamento virtual para manter compatibilidade absoluta com o frontend
      return {
        ...bilheteAtualizado,
        nomeCliente: bilheteAtualizado.recebimento?.nomeCliente ?? null,
        foneCliente: bilheteAtualizado.recebimento?.foneCliente ?? null,
        comprovante: bilheteAtualizado.recebimento?.comprovante ?? null
      };
    });
  }

  async atualizarBilhetesEmLote(dto: UpdateBilheteBulkDto, vendedorId: number) {
    const { ids, ...dados } = dto;

    return this.prisma.$transaction(async (tx) => {
      const bilhetes = await tx.bilhete.findMany({
        where: { id: { in: ids } },
        include: { rifa: true }
      });

      if (bilhetes.length === 0) throw new BadRequestException('Nenhum bilhete informado.');
      if (bilhetes[0].rifa.status === 'FINALIZADA' || bilhetes[0].rifa.status === 'SORTEADA') {
        throw new BadRequestException('Não é permitido alterar bilhetes de uma campanha finalizada ou sorteada.');
      }

      for (const bilhete of bilhetes) {
        if (bilhete.vendedorId !== vendedorId) {
          throw new BadRequestException(`O bilhete ${bilhete.numero} não pertence à sua cartela.`);
        }
        if (bilhete.status === 'VENDIDO') {
          throw new BadRequestException(`O bilhete ${bilhete.numero} já está vendido e não pode ser alterado.`);
        }
      }

      // Permitir LIVRE apenas se todos forem RESERVADO (ou já LIVRE)
      if (dados.status === 'LIVRE') {
        const temVendido = bilhetes.some(b => b.status === 'VENDIDO');
        if (temVendido) throw new BadRequestException('Não é permitido liberar bilhetes já vendidos.');
      }

      if (dados.status === 'VENDIDO' && !dados.comprovante) {
        throw new BadRequestException('É obrigatório informar o comprovante para confirmar a venda.');
      }

      // Se passou a ser VENDIDO, registrar um ÚNICO Recebimento para todo o lote
      let recebimentoId: number | null = null;
      if (dados.status === 'VENDIDO') {
        const recebimento = await tx.recebimentoRifa.create({
          data: {
            valor: bilhetes.length * bilhetes[0].rifa.valorNumero,
            comprovante: dados.comprovante,
            metodo: 'PIX',
            nomeCliente: dados.nomeCliente,
            foneCliente: dados.foneCliente,
            rifaId: bilhetes[0].rifaId,
            vendedorId: vendedorId,
            dataRecebimento: new Date()
          }
        });
        recebimentoId = recebimento.id;
      }

      const updateResult = await tx.bilhete.updateMany({
        where: { id: { in: ids } },
        data: {
          status: dados.status,
          dataVenda: dados.status === 'VENDIDO' ? new Date() : null,
          recebimentoId: dados.status === 'LIVRE' ? null : (recebimentoId ?? undefined)
        }
      });

      return updateResult;
    });
  }

  async atualizar(id: number, dto: any) {
    const rifaExistente = await this.prisma.rifa.findUnique({ where: { id } });
    if (!rifaExistente) throw new NotFoundException('Rifa não encontrada');
    if (rifaExistente.status === 'FINALIZADA' || rifaExistente.status === 'SORTEADA') {
      throw new BadRequestException('Não é permitido editar uma campanha finalizada ou sorteada.');
    }

    const { premios } = dto;
    // Mapear apenas os campos permitidos para evitar lixo do frontend
    const dadosFormatados: any = {
      nome: dto.nome,
      titulo: dto.titulo,
      descricao: dto.descricao,
      valorNumero: dto.valorNumero,
      numerosPorCartela: dto.numerosPorCartela,
      totalNumeros: dto.totalNumeros,
      status: dto.status,
      premioVendedor: dto.premioVendedor,
      percentualRateio: dto.percentualRateio,
      eventoId: dto.eventoId ? Number(dto.eventoId) : undefined,
      chavePix: dto.chavePix || null,
      tipoChavePix: dto.tipoChavePix || null,
      dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : undefined,
      dataFim: dto.dataFim ? new Date(dto.dataFim) : undefined,
      dataSorteio: dto.dataSorteio ? new Date(dto.dataSorteio) : undefined,
    };

    try {
      return await this.prisma.rifa.update({
        where: { id },
        data: {
          ...dadosFormatados,
          premios: premios ? {
            deleteMany: {},
            create: premios.map(p => ({
              descricao: p.descricao,
              posicao: p.posicao
            }))
          } : undefined
        }
      });
    } catch (err) {
      console.error('ERRO AO ATUALIZAR RIFA:', err);
      throw err;
    }
  }

  async ratearArrecadacao(id: number, user: any) {
    if (user.papel !== 'ADMIN') throw new ForbiddenException('Apenas administradores podem realizar o rateio.');

    const rifa = await this.prisma.rifa.findUnique({
      where: { id },
      include: { bilhetes: true, evento: true }
    });

    if (!rifa) throw new NotFoundException('Rifa não encontrada');
    if (rifa.status === 'FINALIZADA' || rifa.status === 'SORTEADA') {
      throw new BadRequestException('Esta campanha já foi rateada ou finalizada.');
    }
    const isEncerrada = new Date(rifa.dataFim.toISOString().split('T')[0] + 'T23:59:59') < new Date();
    if (!isEncerrada) {
      throw new BadRequestException('A campanha ainda não atingiu a data limite de vendas.');
    }
    if (!rifa.evento?.contaId) {
      throw new BadRequestException('Não há uma conta bancária vinculada ao evento desta rifa para o rateio.');
    }

    const bilhetesVendidos = rifa.bilhetes.filter(b => b.status === 'VENDIDO');
    if (bilhetesVendidos.length === 0) {
      throw new BadRequestException('Nenhum bilhete vendido para ratear.');
    }

    const valorArrecadadoTotal = bilhetesVendidos.length * rifa.valorNumero;
    const rateioPessoa = rifa.percentualRateio / 100;
    const valorParaVendedores = valorArrecadadoTotal * rateioPessoa;
    const valorParaConta = valorArrecadadoTotal - valorParaVendedores;

    return this.prisma.$transaction(async (tx) => {
      // 1. Registrar transação global para a conta da paróquia (RECEITA)
      await tx.transacao.create({
        data: {
          valor: valorParaConta,
          tipo: 'RECEITA',
          origem: 'RIFA',
          descricao: `Rateio de Arrecadação - Rifa: ${rifa.nome}`,
          contaId: rifa.evento.contaId,
          rifaId: rifa.id,
          eventoId: rifa.eventoId,
          data: new Date()
        }
      });

      // 2. Incrementar saldo da Conta
      if (valorParaConta > 0) {
        await tx.conta.update({
          where: { id: rifa.evento.contaId },
          data: { saldo: { increment: valorParaConta } }
        });
      }

      // 3. Registrar a comissão dos vendedores (RECEITA no vendedor)
      const vendasPorPessoa: Record<number, number> = {};
      for (const b of bilhetesVendidos) {
        if (b.vendedorId) {
          vendasPorPessoa[b.vendedorId] = (vendasPorPessoa[b.vendedorId] || 0) + 1;
        }
      }

      for (const [pessoaIdStr, qtd] of Object.entries(vendasPorPessoa)) {
        const pessoaId = Number(pessoaIdStr);
        // Comissão líquida correspondente ao percentual do rateio do vendedor
        const comissao = qtd * rifa.valorNumero * rateioPessoa;

        if (comissao > 0) {
          await tx.transacao.create({
            data: {
              valor: comissao,
              tipo: 'RECEITA',
              origem: 'RIFA',
              descricao: `Comissão de Vendas (${qtd} bilhetes) - Rifa: ${rifa.nome}`,
              pessoaId: pessoaId,
              rifaId: rifa.id,
              eventoId: rifa.eventoId,
              data: new Date()
            }
          });
        }
      }

      // 4. Marcar a Rifa como FINALIZADA
      const rifaAtualizada = await tx.rifa.update({
        where: { id },
        data: { status: 'FINALIZADA' }
      });

      return {
        mensagem: 'Rateio realizado com sucesso',
        valorTotal: valorArrecadadoTotal,
        valorConta: valorParaConta,
        valorVendedores: valorParaVendedores,
        rifa: rifaAtualizada
      };
    });
  }

  async obterResumo(id: number, user: any) {
    const rifaCheck = await this.prisma.rifa.findUnique({
      where: { id },
      include: { evento: true }
    });
    
    if (!rifaCheck) throw new NotFoundException('Rifa não encontrada');
    if (user.papel !== 'ADMIN' && rifaCheck.evento?.paroquiaId !== user.paroquiaId) {
      throw new ForbiddenException('Acesso negado');
    }

    const bilhetesDb = await this.prisma.bilhete.findMany({
      where: { rifaId: id },
      include: { vendedor: true, recebimento: true }
    });

    const bilhetes = bilhetesDb.map(b => ({
      ...b,
      nomeCliente: b.recebimento?.nomeCliente ?? null,
      foneCliente: b.recebimento?.foneCliente ?? null,
      comprovante: b.recebimento?.comprovante ?? null
    }));

    const geral = {
      total: bilhetes.length,
      livres: bilhetes.filter(b => b.status === 'LIVRE').length,
      reservados: bilhetes.filter(b => b.status === 'RESERVADO').length,
      vendidos: bilhetes.filter(b => b.status === 'VENDIDO').length,
    };

    const porVendedorMap = new Map();

    bilhetes.forEach(b => {
      if (!b.vendedorId || !b.vendedor) return;
      
      if (!porVendedorMap.has(b.vendedorId)) {
        porVendedorMap.set(b.vendedorId, {
          nome: b.vendedor.nome,
          total: 0,
          livres: 0,
          reservados: 0,
          vendidos: 0,
          bilhetes: []
        });
      }

      const stats = porVendedorMap.get(b.vendedorId);
      stats.total++;
      if (b.status === 'LIVRE') stats.livres++;
      if (b.status === 'RESERVADO') stats.reservados++;
      if (b.status === 'VENDIDO') stats.vendidos++;
      stats.bilhetes.push(b);
    });

    const arrecadado = geral.vendidos * (rifaCheck?.valorNumero || 0);
    const rateio = arrecadado * ((rifaCheck?.percentualRateio || 100) / 100);
    const reserva = arrecadado - rateio;

    const financeiro = {
      arrecadado,
      rateio,
      reserva,
      percentualRateio: rifaCheck?.percentualRateio || 100
    };

    return {
      geral,
      financeiro,
      vendedores: Array.from(porVendedorMap.values())
    };
  }

  async listarMeusBilhetes(rifaId: number, vendedorId: number) {
    if (!vendedorId) {
      return { bilhetes: [], alocacoes: [] };
    }
    const bilhetesDb = await this.prisma.bilhete.findMany({
      where: { rifaId, vendedorId },
      include: { recebimento: true },
      orderBy: { numero: 'asc' }
    });

    const bilhetes = bilhetesDb.map(b => ({
      ...b,
      nomeCliente: b.recebimento?.nomeCliente ?? null,
      foneCliente: b.recebimento?.foneCliente ?? null,
      comprovante: b.recebimento?.comprovante ?? null
    }));

    const alocacoes = await this.prisma.alocacaoRifa.findMany({
      where: { rifaId, pessoaId: vendedorId },
      orderBy: { criadoEm: 'asc' }
    });

    return { bilhetes, alocacoes };
  }

  async remover(id: number) {
    const rifaExistente = await this.prisma.rifa.findUnique({ where: { id } });
    if (!rifaExistente) throw new NotFoundException('Rifa não encontrada');
    if (rifaExistente.status === 'FINALIZADA' || rifaExistente.status === 'SORTEADA') {
      throw new BadRequestException('Não é permitido excluir uma campanha finalizada ou sorteada.');
    }

    const bilhetesComprometidos = await this.prisma.bilhete.findFirst({
      where: {
        rifaId: id,
        status: { in: ['RESERVADO', 'VENDIDO'] }
      }
    });

    if (bilhetesComprometidos) {
      throw new BadRequestException('Não é possível excluir uma campanha que já possui números reservados ou vendidos.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.premio.deleteMany({ where: { rifaId: id } });
      await tx.bilhete.deleteMany({ where: { rifaId: id } });
      await tx.recebimentoRifa.deleteMany({ where: { rifaId: id } });
      await tx.alocacaoRifa.deleteMany({ where: { rifaId: id } });
      return tx.rifa.delete({ where: { id } });
    });
  }

  async limparTudo() {
    return this.prisma.$transaction(async (tx) => {
      await tx.bilhete.deleteMany({});
      await tx.recebimentoRifa.deleteMany({});
      await tx.alocacaoRifa.deleteMany({});
      await tx.premio.deleteMany({});
      await tx.rifa.deleteMany({});
      await tx.transacao.deleteMany({});
      await tx.conta.updateMany({ data: { saldo: 0 } });

      return { message: 'Dados de rifas, alocações, transações e saldos foram limpos.' };
    });
  }
}

// Trigger restart
