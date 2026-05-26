import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { VendasService } from './src/vendas/vendas.service';
import { TrabalhosService } from './src/trabalhos/trabalhos.service';
import { PrismaService } from './src/prisma/prisma.service';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bgBlue: '\x1b[44m',
};

function logHeader(title: string) {
  console.log(`\n${colors.bgBlue}${colors.bright} === ${title} === ${colors.reset}\n`);
}

function logSuccess(message: string) {
  console.log(`  ${colors.green}✔ ${message}${colors.reset}`);
}

function logError(message: string) {
  console.log(`  ${colors.red}✘ ${message}${colors.reset}`);
}

function logInfo(message: string) {
  console.log(`  ${colors.cyan}ℹ ${message}${colors.reset}`);
}

function logWarn(message: string) {
  console.log(`  ${colors.yellow}⚠ ${message}${colors.reset}`);
}

function assertEqual(actual: any, expected: any, description: string) {
  if (actual === expected) {
    logSuccess(`${description}: Esperado [${expected}], obtido [${actual}]`);
  } else {
    logError(`${description}: FALHOU! Esperado [${expected}], obtido [${actual}]`);
    throw new Error(`Assertion failed: ${description}. Expected ${expected}, got ${actual}`);
  }
}

async function bootstrap() {
  logHeader('INICIALIZANDO CONTEXTO DO NESTJS PARA TESTES DE VENDAS EM TEMPO REAL');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vendasService = app.get(VendasService);
  const trabalhosService = app.get(TrabalhosService);
  const prisma = app.get(PrismaService);
  logSuccess('Contexto NestJS e PrismaService carregados.');

  let paroquiaId: number | undefined = undefined;
  let contaId: number | undefined = undefined;
  let pessoa1Id: number | undefined = undefined;
  let pessoa2Id: number | undefined = undefined;
  let produto1Id: number | undefined = undefined;
  let produto2Id: number | undefined = undefined;
  let trabalhoId: number | undefined = undefined;

  try {
    logHeader('FASE 0: CORREÇÃO E ALINHAMENTO DE SEQUENCES POSTGRESQL');
    const tables = [
      'paroquias',
      'contas',
      'pessoas',
      'trabalhos',
      'membros_trabalho',
      'recebimentos_trabalho',
      'despesas_trabalho',
      'lotes_rateio',
      'transacoes',
      'produtos_venda',
      'trabalho_produtos',
      'vendas',
      'itens_venda',
    ];
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce((SELECT max(id) FROM "${table}"), 0) + 1, false);`
        );
      } catch (err: any) {
        // Ignora silenciosamente
      }
    }
    logSuccess('Sequences do PostgreSQL corrigidas.');

    logHeader('FASE 1: PREPARAÇÃO E LIMPEZA DO BANCO');
    
    // Limpeza por integridade
    await prisma.transacao.deleteMany({
      where: { descricao: { contains: 'Vendas Teste' } },
    });
    await prisma.recebimentoTrabalho.deleteMany({
      where: { trabalho: { descricao: { contains: 'Vendas Teste' } } },
    });
    await prisma.itemVenda.deleteMany({
      where: { venda: { trabalho: { descricao: { contains: 'Vendas Teste' } } } },
    });
    await prisma.venda.deleteMany({
      where: { trabalho: { descricao: { contains: 'Vendas Teste' } } },
    });
    await prisma.trabalhoProduto.deleteMany({
      where: { trabalho: { descricao: { contains: 'Vendas Teste' } } },
    });
    await prisma.membroTrabalho.deleteMany({
      where: { trabalho: { descricao: { contains: 'Vendas Teste' } } },
    });
    await prisma.loteRateio.deleteMany({
      where: { trabalho: { descricao: { contains: 'Vendas Teste' } } },
    });
    await prisma.trabalho.deleteMany({
      where: { descricao: { contains: 'Vendas Teste' } },
    });
    await prisma.produtoVenda.deleteMany({
      where: { nome: { contains: 'Teste Consolidada' } },
    });

    const antigasPessoas = await prisma.pessoa.findMany({
      where: { email: { in: ['vendedor1.teste@consolidada.com', 'vendedor2.teste@consolidada.com'] } },
    });
    for (const p of antigasPessoas) {
      await prisma.usuario.deleteMany({ where: { pessoaId: p.id } });
      await prisma.pessoa.delete({ where: { id: p.id } });
    }

    const antigaConta = await prisma.conta.findFirst({ where: { nome: 'Conta Vendas Teste' } });
    if (antigaConta) {
      await prisma.transacao.deleteMany({ where: { contaId: antigaConta.id } });
      await prisma.conta.delete({ where: { id: antigaConta.id } });
    }

    const antigaParoquia = await prisma.paroquia.findFirst({ where: { nome: 'GF PAROQUIA VENDAS TESTE' } });
    if (antigaParoquia) {
      await prisma.paroquia.delete({ where: { id: antigaParoquia.id } });
    }

    logSuccess('Limpeza de estado concluída.');

    // 1. Criar Paróquia e Conta
    const paroquia = await prisma.paroquia.create({
      data: {
        nome: 'GF PAROQUIA VENDAS TESTE',
        paroco: 'Padre Vendas Teste',
        cidade: 'Cidade Vendas Teste',
      },
    });
    paroquiaId = paroquia.id;

    const conta = await prisma.conta.create({
      data: {
        nome: 'Conta Vendas Teste',
        saldo: 0.0,
        paroquiaId,
      },
    });
    contaId = conta.id;

    // 2. Criar 2 Pessoas/Trabalhadores
    const vendedor1 = await prisma.pessoa.create({
      data: {
        nome: 'Vendedor Teste Um',
        email: 'vendedor1.teste@consolidada.com',
        paroquiaId,
        telefone: '11977777701',
      },
    });
    pessoa1Id = vendedor1.id;

    const vendedor2 = await prisma.pessoa.create({
      data: {
        nome: 'Vendedor Teste Dois',
        email: 'vendedor2.teste@consolidada.com',
        paroquiaId,
        telefone: '11977777702',
      },
    });
    pessoa2Id = vendedor2.id;
    logSuccess('Estruturas de teste criadas.');

    // 3. Criar 2 Produtos no Catálogo
    const p1 = await prisma.produtoVenda.create({
      data: {
        nome: 'Pastel Teste Consolidada',
        valor: 8.0,
        ativo: true,
      },
    });
    produto1Id = p1.id;

    const p2 = await prisma.produtoVenda.create({
      data: {
        nome: 'Refri Teste Consolidada',
        valor: 5.0,
        ativo: true,
      },
    });
    produto2Id = p2.id;
    logSuccess(`Produtos de Venda criados: Pastel (R$ 8.00, ID: ${produto1Id}) e Refri (R$ 5.00, ID: ${produto2Id})`);

    // ==========================================
    // INICIAR TURNO DE VENDAS (SEM CONTA)
    // ==========================================
    logHeader('INICIANDO TURNO DE VENDAS (OPÇÃO B - SEM CONTA INICIAL)');
    const trabalho = await trabalhosService.create({
      descricao: 'Vendas Teste Turno Consolidado',
      dataTrabalho: new Date().toISOString(),
      tipo: 'GRUPO',
      proporcao: 100,
      membrosIds: [pessoa1Id, pessoa2Id],
    });
    trabalhoId = trabalho.id;
    assertEqual(trabalho.contaId, null, 'Turno de vendas criado sem conta financeira');
    assertEqual(trabalho.status, 'ABERTO', 'Status inicial do turno de vendas');

    // Configurar produtos ativos
    await vendasService.configurarProdutos(trabalhoId, [produto1Id, produto2Id]);
    logSuccess('Produtos ativos configurados no turno.');

    // ==========================================
    // LANÇAR VENDAS DA SESSÃO
    // ==========================================
    logHeader('LANÇANDO VENDAS NA SESSÃO DE CAIXA');
    
    // Venda 1: 2 Pastéis (R$ 16.00) pagos em PIX
    const v1 = await vendasService.create({
      trabalhoId,
      descricao: 'Mesa 1',
      metodoPagamento: 'PIX',
      statusPagamento: 'PAGO',
      itens: [{ produtoId: produto1Id, quantidade: 2 }],
    });
    assertEqual(v1.valorTotal, 16.0, 'Valor da Venda 1 (2x Pastel R$8)');

    // Venda 2: 1 Pastel + 2 Refris (R$ 18.00) pagos em PIX
    const v2 = await vendasService.create({
      trabalhoId,
      descricao: 'Mesa 2',
      metodoPagamento: 'PIX',
      statusPagamento: 'PAGO',
      itens: [
        { produtoId: produto1Id, quantidade: 1 },
        { produtoId: produto2Id, quantidade: 2 },
      ],
    });
    assertEqual(v2.valorTotal, 18.0, 'Valor da Venda 2 (1x Pastel, 2x Refri)');

    // Venda 3: 2 Refris (R$ 10.00) pagos em DINHEIRO
    const v3 = await vendasService.create({
      trabalhoId,
      descricao: 'Mesa 3',
      metodoPagamento: 'DINHEIRO',
      statusPagamento: 'PAGO',
      itens: [{ produtoId: produto2Id, quantidade: 2 }],
    });
    assertEqual(v3.valorTotal, 10.0, 'Valor da Venda 3 (2x Refri R$5)');

    // Venda 4: 1 Pastel (R$ 8.00) PENDENTE, pago em PIX (retirado método FIADO / A_PRAZO)
    const v4 = await vendasService.create({
      trabalhoId,
      descricao: 'Cliente Inadimplente',
      metodoPagamento: 'PIX',
      statusPagamento: 'PENDENTE',
      itens: [{ produtoId: produto1Id, quantidade: 1 }],
    });
    assertEqual(v4.valorTotal, 8.0, 'Valor da Venda 4 (Pendente PIX - 1x Pastel)');

    // ==========================================
    // VALIDAÇÃO EM TEMPO REAL COM CAIXA ABERTO
    // ==========================================
    logHeader('VALIDANDO INTEGRIDADE FINANCEIRA COM CAIXA ABERTO (REAL-TIME)');
    
    // Agora, os recebimentos são criados IMEDIATAMENTE no ato de cada venda
    const recebimentosAntes = await prisma.recebimentoTrabalho.findMany({
      where: { trabalhoId },
      orderBy: { id: 'asc' },
    });
    assertEqual(recebimentosAntes.length, 4, 'Quantidade de recebimentos criados em tempo real');

    const rec1 = recebimentosAntes.find((r) => r.id === v1.recebimentoId);
    const rec2 = recebimentosAntes.find((r) => r.id === v2.recebimentoId);
    const rec3 = recebimentosAntes.find((r) => r.id === v3.recebimentoId);
    const rec4 = recebimentosAntes.find((r) => r.id === v4.recebimentoId);

    assertEqual(rec1?.valor, 16.0, 'Valor do recebimento da Venda 1');
    assertEqual(rec1?.status, 'PAGO', 'Status do recebimento da Venda 1');
    assertEqual(rec1?.descricao, 'MESA 1', 'Descrição do recebimento da Venda 1 em sincronia');
    assertEqual(rec1?.metodo, 'PIX', 'Método do recebimento da Venda 1');

    assertEqual(rec2?.valor, 18.0, 'Valor do recebimento da Venda 2');
    assertEqual(rec2?.status, 'PAGO', 'Status do recebimento da Venda 2');
    assertEqual(rec2?.descricao, 'MESA 2', 'Descrição do recebimento da Venda 2 em sincronia');

    assertEqual(rec3?.valor, 10.0, 'Valor do recebimento da Venda 3');
    assertEqual(rec3?.status, 'PAGO', 'Status do recebimento da Venda 3');
    assertEqual(rec3?.descricao, 'MESA 3', 'Descrição do recebimento da Venda 3 em sincronia');
    assertEqual(rec3?.metodo, 'DINHEIRO', 'Método do recebimento da Venda 3');

    assertEqual(rec4?.valor, 8.0, 'Valor do recebimento da Venda 4');
    assertEqual(rec4?.status, 'PENDENTE', 'Status do recebimento da Venda 4');
    assertEqual(rec4?.descricao, 'CLIENTE INADIMPLENTE', 'Descrição do recebimento da Venda 4 em sincronia');
    assertEqual(rec4?.metodo, 'PIX', 'Método do recebimento da Venda 4');

    logSuccess('Integridade perfeita: financeiro em sincronia absoluta com cada venda em tempo real.');

    // ==========================================
    // FECHAMENTO DO TURNO (SEM CRIAÇÃO DE NOVOS REGISTROS)
    // ==========================================
    logHeader('FECHANDO TURNO E VALIDANDO CONTINUIDADE DOS REGISTROS');
    
    const turnoFechado = await vendasService.fecharTurno(trabalhoId);
    assertEqual(turnoFechado.status, 'EM_ANDAMENTO', 'Status do trabalho após fechamento de turno');

    // Verificar que os recebimentos permanecem exatamente iguais após fechar turno (4 recebimentos)
    const recebimentosDepois = await prisma.recebimentoTrabalho.findMany({
      where: { trabalhoId },
      orderBy: { id: 'asc' },
    });
    assertEqual(recebimentosDepois.length, 4, 'Quantidade de recebimentos permanece inalterada');
    
    logSuccess('Fechamento de turno efetuado com sucesso absoluto!');

    // ==========================================
    // EXECUTAR RATEIO (DEVE BATER SEGURANÇA E RATEAR)
    // ==========================================
    logHeader('VALIDANDO SEGURANÇA DE CONTA E PROCESSANDO RATEIO');
    
    // Tentar executar o rateio sem conta associada ao trabalho (deve falhar de forma segura)
    logInfo('Tentando processar rateio no trabalho sem conta associada...');
    try {
      await trabalhosService.executarRateio(trabalhoId);
      logError('O sistema permitiu ratear um trabalho sem conta associada!');
      throw new Error('Falha de segurança de conta');
    } catch (err: any) {
      assertEqual(
        err.message.includes('associar uma Conta Financeira'),
        true,
        `Bloqueio de rateio sem conta funciona (Erro: "${err.message}")`
      );
    }

    // Associar conta e processar rateio
    logInfo('Associando conta de destino ao trabalho...');
    await prisma.trabalho.update({
      where: { id: trabalhoId },
      data: { contaId },
    });

    logInfo('Processando o rateio oficial pelo administrador...');
    const resultRateio = await trabalhosService.executarRateio(trabalhoId);
    
    // Totais esperados no rateio:
    // Arrecadado Pago = R$ 34 (Pix) + R$ 10 (Dinheiro) = R$ 44.00
    // O Fiado de R$ 8.00 está PENDENTE, logo NÃO entra no rateio atual!
    // Cada um dos 2 membros recebe: R$ 44.00 / 2 = R$ 22.00
    assertEqual(resultRateio.valorArrecadado, 44.0, 'Arrecadação bruta processada no rateio (apenas pagos)');
    assertEqual(resultRateio.valorDespesas, 0.0, 'Dedução de despesas operacionais');
    assertEqual(resultRateio.valorLiquido, 44.0, 'Arrecadação líquida distribuída');

    // Verificar os repasses dos trabalhadores
    const repassesT1 = await prisma.transacao.findMany({
      where: { pessoaId: pessoa1Id, loteRateioId: resultRateio.loteRateioId },
    });
    assertEqual(repassesT1.length, 2, 'Transações de repasse geradas para Trabalhador 1 (1 por método)');
    const totalRepasseT1 = repassesT1.reduce((acc, t) => acc + t.valor, 0);
    assertEqual(totalRepasseT1, 22.0, 'Valor total de repasse recebido por Trabalhador 1 (44 / 2)');
    assertEqual(repassesT1.every(t => t.tipo === 'RECEITA'), true, 'Todas as transações de repasse devem ser do tipo RECEITA');

    const repassesT2 = await prisma.transacao.findMany({
      where: { pessoaId: pessoa2Id, loteRateioId: resultRateio.loteRateioId },
    });
    assertEqual(repassesT2.length, 2, 'Transações de repasse geradas para Trabalhador 2 (1 por método)');
    const totalRepasseT2 = repassesT2.reduce((acc, t) => acc + t.valor, 0);
    assertEqual(totalRepasseT2, 22.0, 'Valor total de repasse recebido por Trabalhador 2 (44 / 2)');

    // Verificar créditos na conta paroquial:
    // Como é um Trabalho em Grupo (100% repasse) com R$ 0 despesas operacionais, 
    // nenhuma transação de reembolso deve ser gerada na conta paroquial.
    const transacoesParoquia = await prisma.transacao.findMany({
      where: { contaId, pessoaId: null, loteRateioId: resultRateio.loteRateioId },
    });
    assertEqual(transacoesParoquia.length, 0, 'Nenhum lançamento de reembolso gerado na conta paroquial (despesas zeradas)');

    logSuccess('Rateio e contabilização executados perfeitamente!');
    logHeader('SUÍTE DE TESTES DE INTEGRAÇÃO DE VENDAS CONSOLIDADAS: TUDO APROVADO!');

  } catch (error: any) {
    logError(`Ocorreu um erro durante a execução do teste: ${error.message}`);
    console.error(error);
  } finally {
    logHeader('FASE 3: TEAR DOWN (LIMPEZA COMPLETA DO BANCO DE DADOS)');
    try {
      if (trabalhoId) {
        await prisma.transacao.deleteMany({
          where: { loteRateio: { trabalhoId } },
        });
        await prisma.recebimentoTrabalho.deleteMany({
          where: { trabalhoId },
        });
        await prisma.itemVenda.deleteMany({
          where: { venda: { trabalhoId } },
        });
        await prisma.venda.deleteMany({
          where: { trabalhoId },
        });
        await prisma.trabalhoProduto.deleteMany({
          where: { trabalhoId },
        });
        await prisma.membroTrabalho.deleteMany({
          where: { trabalhoId },
        });
        await prisma.loteRateio.deleteMany({
          where: { trabalhoId },
        });
        await prisma.trabalho.delete({
          where: { id: trabalhoId },
        });
        logInfo('Estruturas de turnos e vendas deletadas.');
      }

      if (produto1Id || produto2Id) {
        await prisma.produtoVenda.deleteMany({
          where: { id: { in: [produto1Id, produto2Id].filter(Boolean) as number[] } },
        });
        logInfo('Produtos do catálogo de testes deletados.');
      }

      if (pessoa1Id || pessoa2Id) {
        const ids = [pessoa1Id, pessoa2Id].filter(Boolean) as number[];
        await prisma.usuario.deleteMany({ where: { pessoaId: { in: ids } } });
        await prisma.pessoa.deleteMany({ where: { id: { in: ids } } });
        logInfo('Trabalhadores de teste deletados.');
      }

      if (contaId) {
        await prisma.transacao.deleteMany({ where: { contaId } });
        await prisma.conta.delete({ where: { id: contaId } });
        logInfo('Conta bancária de teste deletada.');
      }

      if (paroquiaId) {
        await prisma.paroquia.delete({ where: { id: paroquiaId } });
        logInfo('Paróquia de teste deletada.');
      }

      logSuccess('Banco de dados 100% restaurado e limpo.');
    } catch (cleanErr: any) {
      logError(`Erro na limpeza do banco: ${cleanErr.message}`);
    }

    await app.close();
    logInfo('Contexto de testes finalizado.');
  }
}

bootstrap();
