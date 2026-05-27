import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import { LancamentosExtratoService } from './src/lancamentos-extrato/lancamentos-extrato.service';

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

function assertEqual(actual: any, expected: any, description: string) {
  if (actual === expected) {
    logSuccess(`${description}: Esperado [${expected}], obtido [${actual}]`);
  } else {
    logError(`${description}: FALHOU! Esperado [${expected}], obtido [${actual}]`);
    throw new Error(`Assertion failed: ${description}. Expected ${expected}, got ${actual}`);
  }
}

async function bootstrap() {
  logHeader('INICIALIZANDO CONTEXTO DO NESTJS PARA TESTAR IMPORTAÇÃO DE EXTRATOS');
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(LancamentosExtratoService);
  const prisma = app.get(PrismaService);
  logSuccess('Contexto NestJS e PrismaService carregados.');

  let paroquiaId: number | undefined = undefined;
  let contaId: number | undefined = undefined;

  try {
    logHeader('FASE 1: ALINHAMENTO DE SEQUENCES E LIMPEZA');
    
    // Alinhar sequence
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('lancamentos_extrato', 'id'), coalesce((SELECT max(id) FROM "lancamentos_extrato"), 0) + 1, false);`
      );
      logSuccess('Sequence da tabela "lancamentos_extrato" alinhada.');
    } catch (err) {}

    // Limpeza de testes anteriores
    await prisma.lancamentoExtrato.deleteMany({
      where: { conta: { nome: 'Conta Extrato Teste' } }
    });
    const antigaConta = await prisma.conta.findFirst({ where: { nome: 'Conta Extrato Teste' } });
    if (antigaConta) {
      await prisma.conta.delete({ where: { id: antigaConta.id } });
    }
    const antigaParoquia = await prisma.paroquia.findFirst({ where: { nome: 'Paroquia Teste Extratos' } });
    if (antigaParoquia) {
      await prisma.paroquia.delete({ where: { id: antigaParoquia.id } });
    }
    logSuccess('Limpeza inicial realizada.');

    logHeader('FASE 2: PREPARAÇÃO DE DADOS DE TESTE');
    
    // Criar Paróquia
    const paroquia = await prisma.paroquia.create({
      data: {
        nome: 'Paroquia Teste Extratos',
        paroco: 'Padre Extratos',
        cidade: 'Cidade Extratos'
      }
    });
    paroquiaId = paroquia.id;
    logSuccess(`Paróquia de teste criada: ID ${paroquiaId}`);

    // Criar Conta com saldo R$ 500,00
    const conta = await prisma.conta.create({
      data: {
        nome: 'Conta Extrato Teste',
        saldo: 500.0,
        paroquiaId: paroquiaId
      }
    });
    contaId = conta.id;
    logSuccess(`Conta de teste criada: ID ${contaId} com saldo inicial R$ 500,00`);

    logHeader('FASE 3: TESTANDO IMPORTAÇÃO EM LOTE (criarLote)');

    // Dados de extrato fictícios: 1 receita de R$ 150,00 e 1 despesa de R$ 50,00
    const dtos = [
      {
        data: '2026-05-27',
        descricao: 'PIX RECEBIDO DOACAO',
        valor: 150.0,
        tipo: 'RECEITA' as any,
        metodo: 'PIX',
        contaId: contaId
      },
      {
        data: '2026-05-27',
        descricao: 'PAGAMENTO ENERGIA ELETRICA',
        valor: 50.0,
        tipo: 'DESPESA' as any,
        metodo: 'TRANSFERENCIA',
        contaId: contaId
      }
    ];

    logInfo('Gravando lote de 2 lançamentos no extrato...');
    const res = await service.criarLote(dtos);
    assertEqual(res.count, 2, 'Quantidade de registros salvos no extrato');

    logHeader('FASE 4: VERIFICANDO LISTAGEM E INTEGRIDADE DE DADOS');

    // Buscar lançamentos salvos
    const lancamentos = await service.buscarPorConta(contaId);
    assertEqual(lancamentos.length, 2, 'Lançamentos retornados para a conta');
    
    const receita = lancamentos.find(l => l.tipo === 'RECEITA');
    assertEqual(receita?.valor, 150.0, 'Valor do lançamento de Receita');
    assertEqual(receita?.descricao, 'PIX RECEBIDO DOACAO', 'Descrição do lançamento de Receita');
    assertEqual(receita?.conciliado, false, 'Lançamento de Receita deve iniciar com conciliado=false');

    const despesa = lancamentos.find(l => l.tipo === 'DESPESA');
    assertEqual(despesa?.valor, 50.0, 'Valor do lançamento de Despesa');
    assertEqual(despesa?.descricao, 'PAGAMENTO ENERGIA ELETRICA', 'Descrição do lançamento de Despesa');

    // Verificar se o saldo da conta continuou R$ 500,00 (não deve ter sido alterado!)
    const contaDb = await prisma.conta.findUnique({ where: { id: contaId } });
    assertEqual(contaDb?.saldo, 500.0, 'Saldo da Conta Bancária após a importação do extrato');

    logSuccess('Validações de importação concluídas com sucesso absoluto!');

  } catch (err: any) {
    logError(`Erro durante os testes: ${err.message}`);
    console.error(err);
  } finally {
    logHeader('FASE 5: TEAR DOWN E LIMPEZA INTEGRAL');
    try {
      if (contaId) {
        await prisma.lancamentoExtrato.deleteMany({ where: { contaId } });
        await prisma.conta.delete({ where: { id: contaId } });
        logSuccess('Conta e lançamentos de extrato de teste excluídos.');
      }
      if (paroquiaId) {
        await prisma.paroquia.delete({ where: { id: paroquiaId } });
        logSuccess('Paróquia de teste excluída.');
      }
    } catch (err: any) {
      logError(`Erro ao limpar dados de teste: ${err.message}`);
    }

    await app.close();
    logInfo('Contexto de teste encerrado.');
  }
}

bootstrap();
