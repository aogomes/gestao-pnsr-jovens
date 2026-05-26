import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { RifasService } from './src/rifas/rifas.service';
import { PessoasService } from './src/pessoas/pessoas.service';
import { PrismaService } from './src/prisma/prisma.service';

// Estilos de logs coloridos para o terminal Windows Powershell / Bash
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
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
  logHeader('INICIALIZANDO CONTEXTO DO NESTJS PARA TESTES');
  const app = await NestFactory.createApplicationContext(AppModule);
  const rifasService = app.get(RifasService);
  const prisma = app.get(PrismaService);
  logSuccess('Contexto NestJS e PrismaService carregados.');

  // Variáveis para rastrear IDs criados para limpeza posterior, inicializadas para TS
  let paroquiaId: number | undefined = undefined;
  let contaId: number | undefined = undefined;
  let pessoa1Id: number | undefined = undefined;
  let pessoa2Id: number | undefined = undefined;
  let rifa1Id: number | undefined = undefined;
  let rifa2Id: number | undefined = undefined;

  try {
    logHeader('FASE 0: CORREÇÃO E ALINHAMENTO DE SEQUENCES POSTGRESQL');
    
    // Alinhar sequências para evitar erros de Constraint de ID único comuns após seeds manuais
    const tables = ['paroquias', 'contas', 'pessoas', 'usuarios', 'rifas', 'bilhetes', 'alocacoes_rifa', 'transacoes', 'recebimentos_rifa'];
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce((SELECT max(id) FROM "${table}"), 0) + 1, false);`
        );
        logSuccess(`Sequence da tabela "${table}" resetada com sucesso.`);
      } catch (err: any) {
        logWarn(`Sequence da tabela "${table}" não pôde ser resetada automaticamente (Pode não usar serial ou estar vazia).`);
      }
    }

    logHeader('FASE 1: PREPARAÇÃO E LIMPEZA DE ESTADO DE TESTE');

    // Limpar qualquer resquício anterior para garantir idempotência do teste
    logInfo('Limpando resquícios de execuções de teste anteriores...');
    
    // Deleta bilhetes/alocacoes de rifas de teste antigas
    await prisma.bilhete.deleteMany({
      where: { rifa: { nome: { in: ['Rifa Teste Integral (100%)', 'Rifa Teste Proporcional (30%)'] } } }
    });
    await prisma.recebimentoRifa.deleteMany({
      where: { rifa: { nome: { in: ['Rifa Teste Integral (100%)', 'Rifa Teste Proporcional (30%)'] } } }
    });
    await prisma.alocacaoRifa.deleteMany({
      where: { rifa: { nome: { in: ['Rifa Teste Integral (100%)', 'Rifa Teste Proporcional (30%)'] } } }
    });
    await prisma.premio.deleteMany({
      where: { rifa: { nome: { in: ['Rifa Teste Integral (100%)', 'Rifa Teste Proporcional (30%)'] } } }
    });
    await prisma.transacao.deleteMany({
      where: {
        descricao: {
          contains: 'Rifa Teste'
        }
      }
    });
    await prisma.rifa.deleteMany({
      where: { nome: { in: ['Rifa Teste Integral (100%)', 'Rifa Teste Proporcional (30%)'] } }
    });

    // Deleta pessoas e paróquia de teste anteriores
    const antigasPessoas = await prisma.pessoa.findMany({
      where: { email: { in: ['vendedor1.teste@integracao.com', 'vendedor2.teste@integracao.com'] } }
    });
    for (const p of antigasPessoas) {
      await prisma.usuario.deleteMany({ where: { pessoaId: p.id } });
      await prisma.pessoa.delete({ where: { id: p.id } });
    }

    const antigaConta = await prisma.conta.findFirst({ where: { nome: 'Conta Rifa Teste' } });
    if (antigaConta) {
      await prisma.transacao.deleteMany({ where: { contaId: antigaConta.id } });
      await prisma.conta.delete({ where: { id: antigaConta.id } });
    }

    const antigaParoquia = await prisma.paroquia.findFirst({ where: { nome: 'GF PAROQUIA TESTE INTEGRACAO' } });
    if (antigaParoquia) {
      await prisma.paroquia.delete({ where: { id: antigaParoquia.id } });
    }

    logSuccess('Limpeza pré-teste concluída.');

    // 1. Criar Paróquia de Teste
    const paroquia = await prisma.paroquia.create({
      data: {
        nome: 'GF PAROQUIA TESTE INTEGRACAO',
        paroco: 'Padre Teste',
        cidade: 'Cidade Teste'
      }
    });
    paroquiaId = paroquia.id;
    logSuccess(`Paróquia criada: [ID ${paroquiaId}] ${paroquia.nome}`);

    // 2. Criar Conta Bancária
    const conta = await prisma.conta.create({
      data: {
        nome: 'Conta Rifa Teste',
        saldo: 0,
        paroquiaId: paroquiaId
      }
    });
    contaId = conta.id;
    logSuccess(`Conta de Teste criada: [ID ${contaId}] ${conta.nome} com Saldo R$ ${conta.saldo}`);

    // 3. Criar dois Vendedores (Pessoas)
    const vendedor1 = await prisma.pessoa.create({
      data: {
        nome: 'Vendedor Teste Um',
        email: 'vendedor1.teste@integracao.com',
        paroquiaId: paroquiaId,
        telefone: '11999999991'
      }
    });
    pessoa1Id = vendedor1.id;
    logSuccess(`Vendedor 1 criado: [ID ${pessoa1Id}] ${vendedor1.nome}`);

    const vendedor2 = await prisma.pessoa.create({
      data: {
        nome: 'Vendedor Teste Dois',
        email: 'vendedor2.teste@integracao.com',
        paroquiaId: paroquiaId,
        telefone: '11999999992'
      }
    });
    pessoa2Id = vendedor2.id;
    logSuccess(`Vendedor 2 criado: [ID ${pessoa2Id}] ${vendedor2.nome}`);

    // ==========================================
    // CENÁRIO 1: RATEIO INTEGRAL (100% VENDEDOR)
    // ==========================================
    logHeader('CENÁRIO 1: TESTANDO RATEIO INTEGRAL (100% PARA VENDEDORES)');

    // 1. Criar campanha de rifa integral
    const rifa1 = await rifasService.criar({
      nome: 'Rifa Teste Integral (100%)',
      descricao: 'Campanha de teste com rateio 100% vendedor.',
      dataInicio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
      dataFim: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),    // 1 dia atrás (já expirou)
      dataSorteio: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      valorNumero: 10.0, // R$ 10,00 por bilhete
      totalNumeros: 50,
      numerosPorCartela: 10,
      percentualRateio: 100, // 100% comissão
      contaId: contaId,
      premios: [{ descricao: 'Premio Teste Integral', posicao: 1 }]
    }, { papel: 'ADMIN', paroquiaId: null });
    rifa1Id = rifa1.id;
    logSuccess(`Rifa Integral criada: [ID ${rifa1Id}] ${rifa1.nome}`);

    // 2. Alocar números para o Vendedor 1 (Cartela com 10 números)
    const alocacao1 = await rifasService.alocarCartela({
      rifaId: rifa1Id,
      pessoaId: pessoa1Id,
      quantidade: 10
    });
    logSuccess(`Números alocados para Vendedor 1. Faixa: ${alocacao1.inicioRange} a ${alocacao1.fimRange}`);

    // 3. Simular Venda de 5 Bilhetes
    logInfo('Marcando 5 bilhetes como VENDIDOS para o Vendedor 1...');
    const bilhetes1 = await prisma.bilhete.findMany({
      where: { rifaId: rifa1Id, vendedorId: pessoa1Id },
      orderBy: { numero: 'asc' }
    });

    for (let i = 0; i < 5; i++) {
      await rifasService.atualizarBilhete(bilhetes1[i].id, {
        status: 'VENDIDO' as any,
        comprovante: `COMPROVANTE_INTEGRAL_${i+1}`,
        nomeCliente: `Cliente Integral ${i+1}`,
        foneCliente: '11988888888'
      }, pessoa1Id);
    }
    logSuccess('5 bilhetes marcados como VENDIDOS com sucesso.');

    // 4. Ajustar dataFim no banco de dados para garantir que a data fim seja anterior a hoje
    // Isso é feito para contornar a restrição de data do método ratearArrecadacao
    await prisma.rifa.update({
      where: { id: rifa1Id },
      data: { dataFim: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
    });

    // 5. Executar o Rateio (Simulado como ADMIN)
    logInfo('Executando rateio da campanha integral...');
    const rateioIntegral = await rifasService.ratearArrecadacao(rifa1Id, { papel: 'ADMIN', paroquiaId: null });
    logSuccess('Método ratearArrecadacao executado com sucesso.');

    // 6. Asserções do Cenário 1
    logHeader('ASSERÇÕES DO CENÁRIO 1');
    
    // Verificar status da Rifa
    const rifa1Db = await prisma.rifa.findUnique({ where: { id: rifa1Id } });
    assertEqual(rifa1Db?.status, 'FINALIZADA', 'Status final da campanha');

    // Verificar se o valor de arrecadação total está correto
    // 5 bilhetes vendidos * R$ 10,00 = R$ 50,00
    assertEqual(rateioIntegral.valorTotal, 50.0, 'Valor total arrecadado');
    assertEqual(rateioIntegral.valorConta, 0.0, 'Valor destinado à Paróquia (0%)');
    assertEqual(rateioIntegral.valorVendedores, 50.0, 'Valor destinado ao Vendedor (100%)');

    // Verificar saldo da Conta Bancária no banco de dados (deve permanecer zero)
    const contaDb1 = await prisma.conta.findUnique({ where: { id: contaId } });
    assertEqual(contaDb1?.saldo, 0.0, 'Saldo da Conta Bancária da Paróquia pós-rateio integral');

    // Verificar lançamentos na tabela RecebimentoRifa (deve haver 5 recebimentos individuais de venda)
    const recebimentosRifa1 = await prisma.recebimentoRifa.findMany({
      where: { rifaId: rifa1Id }
    });
    assertEqual(recebimentosRifa1.length, 5, 'Quantidade de recebimentos registrados para a Rifa 1');
    const todosVendedor1 = recebimentosRifa1.every(r => r.vendedorId === pessoa1Id && r.valor === 10.0);
    assertEqual(todosVendedor1, true, 'Todos os recebimentos da Rifa 1 pertencem ao Vendedor 1 e têm valor R$ 10,00');

    // Verificar lançamentos na tabela Transacao (deve haver exatamente 1 transação de comissão no rateio)
    const transacoesVendedor1 = await prisma.transacao.findMany({
      where: { pessoaId: pessoa1Id }
    });
    assertEqual(transacoesVendedor1.length, 1, 'Quantidade de transações para o Vendedor 1 (1 comissão no rateio)');
    assertEqual(transacoesVendedor1[0].valor, 50.0, 'Valor da comissão lançada no rateio');
    assertEqual(transacoesVendedor1[0].tipo, 'RECEITA', 'Tipo de transação de comissão (RECEITA)');
    assertEqual(transacoesVendedor1[0].rifaId, rifa1Id, 'Transação de comissão possui o rifaId correto');
    assertEqual(transacoesVendedor1[0].origem, 'RIFA', 'Transação de comissão possui a origem RIFA');

    // Verificar Saldo Dinâmico do Vendedor 1
    const infoVendedor1 = await prisma.pessoa.findUnique({
      where: { id: pessoa1Id },
      include: { transacoes: true }
    });
    const saldoDinamicov1 = infoVendedor1?.transacoes.reduce((acc, t) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0) || 0;
    assertEqual(saldoDinamicov1, 50.0, 'Saldo financeiro dinâmico do Vendedor 1');

    // ==========================================
    // CENÁRIO 2: RATEIO PROPORCIONAL (30% VENDEDOR / 70% PARÓQUIA)
    // ==========================================
    logHeader('CENÁRIO 2: TESTANDO RATEIO PROPORCIONAL (30% VENDEDOR / 70% PARÓQUIA)');

    // 1. Criar campanha de rifa proporcional
    const rifa2 = await rifasService.criar({
      nome: 'Rifa Teste Proporcional (30%)',
      descricao: 'Campanha de teste com rateio 30% vendedor e 70% paróquia.',
      dataInicio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      dataFim: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      dataSorteio: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      valorNumero: 20.0, // R$ 20,00 por bilhete
      totalNumeros: 50,
      numerosPorCartela: 10,
      percentualRateio: 30, // 30% comissão vendedor, 70% paróquia
      contaId: contaId,
      premios: [{ descricao: 'Premio Teste Proporcional', posicao: 1 }]
    }, { papel: 'ADMIN', paroquiaId: null });
    rifa2Id = rifa2.id;
    logSuccess(`Rifa Proporcional criada: [ID ${rifa2Id}] ${rifa2.nome}`);

    // 2. Alocar números para o Vendedor 2 (Cartela com 10 números, deve começar no número 11)
    const alocacao2 = await rifasService.alocarCartela({
      rifaId: rifa2Id,
      pessoaId: pessoa2Id,
      quantidade: 10
    });
    logSuccess(`Números alocados para Vendedor 2. Faixa: ${alocacao2.inicioRange} a ${alocacao2.fimRange}`);
    assertEqual(alocacao2.inicioRange, 1, 'Número inicial da faixa alocada');
    assertEqual(alocacao2.fimRange, 10, 'Número final da faixa alocada');

    // 3. Simular Venda de 8 Bilhetes para o Vendedor 2
    logInfo('Marcando 8 bilhetes como VENDIDOS para o Vendedor 2...');
    const bilhetes2 = await prisma.bilhete.findMany({
      where: { rifaId: rifa2Id, vendedorId: pessoa2Id },
      orderBy: { numero: 'asc' }
    });

    for (let i = 0; i < 8; i++) {
      await rifasService.atualizarBilhete(bilhetes2[i].id, {
        status: 'VENDIDO' as any,
        comprovante: `COMPROVANTE_PROPORCIONAL_${i+1}`,
        nomeCliente: `Cliente Proporcional ${i+1}`,
        foneCliente: '11988888889'
      }, pessoa2Id);
    }
    logSuccess('8 bilhetes marcados como VENDIDOS com sucesso.');

    // 4. Forçar dataFim no passado para o rateio
    await prisma.rifa.update({
      where: { id: rifa2Id },
      data: { dataFim: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
    });

    // 5. Executar o Rateio (ADMIN)
    logInfo('Executando rateio da campanha proporcional...');
    const rateioProporcional = await rifasService.ratearArrecadacao(rifa2Id, { papel: 'ADMIN', paroquiaId: null });
    logSuccess('Método ratearArrecadacao executado com sucesso.');

    // 6. Asserções do Cenário 2
    logHeader('ASSERÇÕES DO CENÁRIO 2');
    
    // Status da campanha
    const rifa2Db = await prisma.rifa.findUnique({ where: { id: rifa2Id } });
    assertEqual(rifa2Db?.status, 'FINALIZADA', 'Status final da campanha proporcional');

    // Validações financeiras matemáticas
    // 8 bilhetes vendidos * R$ 20,00 = R$ 160,00
    // Vendedor recebe 30%: R$ 160 * 0.30 = R$ 48,00
    // Paróquia recebe 70%: R$ 160 * 0.70 = R$ 112,00
    assertEqual(rateioProporcional.valorTotal, 160.0, 'Valor total arrecadado (8 * R$ 20,00)');
    assertEqual(rateioProporcional.valorConta, 112.0, 'Valor destinado à Paróquia (70% de R$ 160,00)');
    assertEqual(rateioProporcional.valorVendedores, 48.0, 'Valor destinado ao Vendedor (30% de R$ 160,00)');

    // Verificar saldo da Conta Bancária da Paróquia
    // Saldo inicial era 0. Deve ter subido para R$ 112,00
    const contaDb2 = await prisma.conta.findUnique({ where: { id: contaId } });
    assertEqual(contaDb2?.saldo, 112.0, 'Saldo da Conta Bancária da Paróquia pós-rateio proporcional');

    // Verificar Transações para a Paróquia
    const transacoesParoquia = await prisma.transacao.findMany({
      where: { contaId: contaId }
    });
    // Rifa 1 gerou 1 transação de conta no valor de 0, Rifa 2 gerou 1 no valor de 112. Total: 2 transações.
    assertEqual(transacoesParoquia.length, 2, 'Quantidade de transações na conta bancária paroquial');
    const transacaoComValor = transacoesParoquia.find(t => t.valor > 0);
    assertEqual(transacaoComValor?.valor, 112.0, 'Lançamento financeiro de receita na conta da paróquia');
    assertEqual(transacaoComValor?.tipo, 'RECEITA', 'Tipo de lançamento na conta paroquial');
    assertEqual(transacaoComValor?.rifaId, rifa2Id, 'Transação de conta possui o rifaId correto');
    assertEqual(transacaoComValor?.descricao.includes('Rateio de Arrecadação - Rifa: Rifa Teste Proporcional'), true, 'Verificação da descrição da transação de conta');

    // Verificar lançamentos na tabela RecebimentoRifa (deve haver 8 recebimentos individuais de venda)
    const recebimentosRifa2 = await prisma.recebimentoRifa.findMany({
      where: { rifaId: rifa2Id }
    });
    assertEqual(recebimentosRifa2.length, 8, 'Quantidade de recebimentos registrados para a Rifa 2');
    const todosVendedor2 = recebimentosRifa2.every(r => r.vendedorId === pessoa2Id && r.valor === 20.0);
    assertEqual(todosVendedor2, true, 'Todos os recebimentos da Rifa 2 pertencem ao Vendedor 2 e têm valor R$ 20,00');

    // Verificar Transações do Vendedor 2
    // Deve conter exatamente 1 transação de RECEITA de comissão no rateio (R$ 48,00)
    const transacoesVendedor2 = await prisma.transacao.findMany({
      where: { pessoaId: pessoa2Id }
    });
    assertEqual(transacoesVendedor2.length, 1, 'Quantidade de transações para o Vendedor 2 (1 comissão no rateio)');
    assertEqual(transacoesVendedor2[0].valor, 48.0, 'Valor da comissão lançada no rateio');
    assertEqual(transacoesVendedor2[0].tipo, 'RECEITA', 'Tipo de transação de comissão (RECEITA)');
    assertEqual(transacoesVendedor2[0].rifaId, rifa2Id, 'Transação de comissão possui o rifaId correto');
    assertEqual(transacoesVendedor2[0].origem, 'RIFA', 'Transação de comissão possui a origem RIFA');

    // Verificar Saldo Dinâmico do Vendedor 2 (deve sobrar exatamente a comissão líquida de R$ 48,00)
    const infoVendedor2 = await prisma.pessoa.findUnique({
      where: { id: pessoa2Id },
      include: { transacoes: true }
    });
    const saldoDinamicov2 = infoVendedor2?.transacoes.reduce((acc, t) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0) || 0;
    assertEqual(saldoDinamicov2, 48.0, 'Saldo financeiro dinâmico do Vendedor 2');


    // ==========================================
    // FASE 3: AUDITORIA DE INTEGRIDADE E ÓRFÃOS
    // ==========================================
    logHeader('FASE 3: AUDITORIA DE INTEGRIDADE DE DADOS E REGISTROS ÓRFÃOS');

    // 1. Verificar Acoplamento das Transações (Risco A)
    logInfo('Verificando se todas as transações criadas possuem link de chave estrangeira (rifaId) com a Rifa...');
    const todasTransacoesTeste = await prisma.transacao.findMany({
      where: {
        OR: [
          { pessoaId: { in: [pessoa1Id, pessoa2Id].filter(Boolean) as number[] } },
          { contaId: contaId }
        ]
      }
    });

    logInfo(`Foram encontradas ${todasTransacoesTeste.length} transações financeiras geradas.`);
    const todasComRifaIdValido = todasTransacoesTeste.every(t => t.rifaId !== null && t.rifaId !== undefined);
    assertEqual(todasComRifaIdValido, true, 'Confirmado: Todas as transações criadas possuem o campo relacional "rifaId" preenchido!');

    // 2. Testar Soft-Delete de Pessoa (Vendedor 1) (Risco B)
    logInfo('Testando o Soft-Delete de uma Pessoa (Vendedor 1) que possui alocações ativas e bilhetes no sistema...');
    try {
      // Criar usuário associado temporário para garantir que ele é deletado físico no soft-delete
      const usuarioVendedor1 = await prisma.usuario.create({
        data: {
          login: 'vendedor1.teste@integracao.com',
          senha: 'senha_criptografada_teste',
          papel: 'USUARIO',
          pessoaId: pessoa1Id
        }
      });
      logSuccess(`Usuário temporário criado para Vendedor 1: [ID ${usuarioVendedor1.id}]`);

      const pessoasService = app.get(PessoasService);
      await pessoasService.remover(pessoa1Id);
      logSuccess('Soft-Delete executado via PessoasService.remover() com sucesso!');

      // Asserções do Soft-Delete
      const pessoa1Db = await prisma.pessoa.findUnique({ where: { id: pessoa1Id } });
      assertEqual(pessoa1Db?.ativo, false, 'Campo ativo do Vendedor 1 após Soft-Delete');

      const usuarioDb = await prisma.usuario.findUnique({ where: { pessoaId: pessoa1Id } });
      assertEqual(usuarioDb, null, 'Usuário associado foi excluído fisicamente para bloquear acessos');

      // Garantir que as alocações e bilhetes continuam indexados ao vendedor
      const alocacoesVendedor1 = await prisma.alocacaoRifa.findMany({ where: { pessoaId: pessoa1Id } });
      assertEqual(alocacoesVendedor1.length > 0, true, 'Alocações históricas mantidas intactas no banco');

      const bilhetesVendedor1 = await prisma.bilhete.findMany({ where: { vendedorId: pessoa1Id } });
      assertEqual(bilhetesVendedor1.length > 0, true, 'Bilhetes históricos mantidos intactas no banco');
    } catch (err: any) {
      logError(`Falha no fluxo de Soft-Delete: ${err.message}`);
      throw err;
    }

    logSuccess('Auditoria de Integridade e Soft-Delete concluída com sucesso absoluto.');

  } catch (error: any) {
    logError(`Ocorreu um erro durante a execução dos testes: ${error.message}`);
    console.error(error);
  } finally {
    logHeader('FASE 4: TEAR DOWN (LIMPEZA INTEGRAL E RESTAURAÇÃO DO BANCO)');
    logInfo('Iniciando limpeza de todos os registros gerados pelo teste de integração...');
    try {
      // 1. Deletar Bilhetes
      const bilhetesDel = await prisma.bilhete.deleteMany({
        where: { rifaId: { in: [rifa1Id, rifa2Id].filter(Boolean) as number[] } }
      });
      logInfo(`Deletados ${bilhetesDel.count} bilhetes de teste.`);

      // 1.5. Deletar Recebimentos de Rifa
      const recebimentosDel = await prisma.recebimentoRifa.deleteMany({
        where: { rifaId: { in: [rifa1Id, rifa2Id].filter(Boolean) as number[] } }
      });
      logInfo(`Deletados ${recebimentosDel.count} recebimentos de rifas de teste.`);

      // 2. Deletar Alocações
      const alocacoesDel = await prisma.alocacaoRifa.deleteMany({
        where: { rifaId: { in: [rifa1Id, rifa2Id].filter(Boolean) as number[] } }
      });
      logInfo(`Deletadas ${alocacoesDel.count} alocações de teste.`);

      // 3. Deletar Prêmios
      const premiosDel = await prisma.premio.deleteMany({
        where: { rifaId: { in: [rifa1Id, rifa2Id].filter(Boolean) as number[] } }
      });
      logInfo(`Deletados ${premiosDel.count} prêmios de teste.`);

      // 4. Deletar Transações
      const transacoesDel = await prisma.transacao.deleteMany({
        where: {
          OR: [
            { pessoaId: { in: [pessoa1Id, pessoa2Id].filter(Boolean) as number[] } },
            { contaId: contaId }
          ]
        }
      });
      logInfo(`Deletadas ${transacoesDel.count} transações financeiras de teste.`);

      // 5. Deletar Rifas
      const rifasDel = await prisma.rifa.deleteMany({
        where: { id: { in: [rifa1Id, rifa2Id].filter(Boolean) as number[] } }
      });
      logInfo(`Deletadas ${rifasDel.count} campanhas de rifa de teste.`);

      // 6. Deletar Vendedores
      if (pessoa1Id || pessoa2Id) {
        const ids = [pessoa1Id, pessoa2Id].filter(Boolean) as number[];
        const usuariosDel = await prisma.usuario.deleteMany({
          where: { pessoaId: { in: ids } }
        });
        logInfo(`Deletados ${usuariosDel.count} usuários associados.`);

        const pessoasDel = await prisma.pessoa.deleteMany({
          where: { id: { in: ids } }
        });
        logInfo(`Deletadas ${pessoasDel.count} pessoas (vendedores) de teste.`);
      }

      // 7. Deletar Conta
      if (contaId) {
        await prisma.conta.delete({ where: { id: contaId } });
        logInfo('Deletada conta bancária de teste.');
      }

      // 8. Deletar Paróquia
      if (paroquiaId) {
        await prisma.paroquia.delete({ where: { id: paroquiaId } });
        logInfo('Deletada paróquia de teste.');
      }

      logSuccess('Todos os dados criados para o teste foram totalmente limpos do banco de dados.');
      logSuccess('Banco de dados restaurado ao estado original com sucesso!');
    } catch (cleanError: any) {
      logError(`Falha durante a limpeza do banco de dados: ${cleanError.message}`);
    }

    await app.close();
    logInfo('Contexto de teste encerrado.');
  }
}

bootstrap();
