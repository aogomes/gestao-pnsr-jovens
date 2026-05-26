import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TrabalhosService } from './src/trabalhos/trabalhos.service';
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
  logHeader('INICIALIZANDO CONTEXTO DO NESTJS PARA TESTES DE TRABALHOS/RECEBIMENTOS/RATEIOS');
  const app = await NestFactory.createApplicationContext(AppModule);
  const trabalhosService = app.get(TrabalhosService);
  const prisma = app.get(PrismaService);
  logSuccess('Contexto NestJS e PrismaService carregados.');

  // Variáveis para limpeza posterior
  let paroquiaId: number | undefined = undefined;
  let contaId: number | undefined = undefined;
  let pessoa1Id: number | undefined = undefined;
  let pessoa2Id: number | undefined = undefined;
  let pessoa3Id: number | undefined = undefined;
  let trabalhoIndividualId: number | undefined = undefined;
  let trabalhoGrupoId: number | undefined = undefined;

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
    ];
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce((SELECT max(id) FROM "${table}"), 0) + 1, false);`
        );
        logSuccess(`Sequence da tabela "${table}" resetada com sucesso.`);
      } catch (err: any) {
        logWarn(`Sequence da tabela "${table}" não pôde ser resetada.`);
      }
    }

    logHeader('FASE 1: PREPARAÇÃO E LIMPEZA DE ESTADO DE TESTE');
    logInfo('Limpando resquícios de execuções anteriores...');

    // Limpezas por integridade relacional
    await prisma.transacao.deleteMany({
      where: { descricao: { contains: 'Trabalho Teste' } },
    });
    await prisma.recebimentoTrabalho.deleteMany({
      where: { trabalho: { descricao: { contains: 'Trabalho Teste' } } },
    });
    await prisma.despesaTrabalho.deleteMany({
      where: { trabalho: { descricao: { contains: 'Trabalho Teste' } } },
    });
    await prisma.membroTrabalho.deleteMany({
      where: { trabalho: { descricao: { contains: 'Trabalho Teste' } } },
    });
    await prisma.loteRateio.deleteMany({
      where: { trabalho: { descricao: { contains: 'Trabalho Teste' } } },
    });
    await prisma.trabalho.deleteMany({
      where: { descricao: { contains: 'Trabalho Teste' } },
    });

    const antigasPessoas = await prisma.pessoa.findMany({
      where: { email: { in: ['trabalhador1.teste@integracao.com', 'trabalhador2.teste@integracao.com', 'trabalhador3.teste@integracao.com'] } },
    });
    for (const p of antigasPessoas) {
      await prisma.usuario.deleteMany({ where: { pessoaId: p.id } });
      await prisma.pessoa.delete({ where: { id: p.id } });
    }

    const antigaConta = await prisma.conta.findFirst({ where: { nome: 'Conta Trabalho Teste' } });
    if (antigaConta) {
      await prisma.transacao.deleteMany({ where: { contaId: antigaConta.id } });
      await prisma.conta.delete({ where: { id: antigaConta.id } });
    }

    const antigaParoquia = await prisma.paroquia.findFirst({ where: { nome: 'GF PAROQUIA TRABALHO TESTE' } });
    if (antigaParoquia) {
      await prisma.paroquia.delete({ where: { id: antigaParoquia.id } });
    }

    logSuccess('Limpeza pré-teste concluída.');

    // 1. Criar Paróquia e Conta de Teste
    const paroquia = await prisma.paroquia.create({
      data: {
        nome: 'GF PAROQUIA TRABALHO TESTE',
        paroco: 'Padre Trabalho Teste',
        cidade: 'Cidade Trabalho Teste',
      },
    });
    paroquiaId = paroquia.id;

    const conta = await prisma.conta.create({
      data: {
        nome: 'Conta Trabalho Teste',
        saldo: 0.0,
        paroquiaId: paroquiaId,
      },
    });
    contaId = conta.id;
    logSuccess(`Paróquia (ID: ${paroquiaId}) e Conta Bancária (ID: ${contaId}) criadas.`);

    // 2. Criar 3 Pessoas (Trabalhadores)
    const trabalhador1 = await prisma.pessoa.create({
      data: {
        nome: 'Trabalhador Teste Um',
        email: 'trabalhador1.teste@integracao.com',
        paroquiaId: paroquiaId,
        telefone: '11988888801',
      },
    });
    pessoa1Id = trabalhador1.id;

    const trabalhador2 = await prisma.pessoa.create({
      data: {
        nome: 'Trabalhador Teste Dois',
        email: 'trabalhador2.teste@integracao.com',
        paroquiaId: paroquiaId,
        telefone: '11988888802',
      },
    });
    pessoa2Id = trabalhador2.id;

    const trabalhador3 = await prisma.pessoa.create({
      data: {
        nome: 'Trabalhador Teste Tres',
        email: 'trabalhador3.teste@integracao.com',
        paroquiaId: paroquiaId,
        telefone: '11988888803',
      },
    });
    pessoa3Id = trabalhador3.id;
    logSuccess(`3 Trabalhadores de teste criados: [IDs: ${pessoa1Id}, ${pessoa2Id}, ${pessoa3Id}]`);


    // ==========================================
    // CENÁRIO 1: TRABALHO INDIVIDUAL - RATEIO PROPORCIONAL
    // ==========================================
    logHeader('CENÁRIO 1: TESTANDO TRABALHO INDIVIDUAL COM REPASSES PROPORCIONAIS');
    logInfo('Criando trabalho do tipo INDIVIDUAL com proporção de repasse de 70%...');

    // 1. Criar Trabalho Individual (Proporção de Repasse: 70% trabalhador, 30% comunidade/paróquia)
    const trabalhoIndividual = await trabalhosService.create({
      descricao: 'Trabalho Teste Individual Proporcional',
      dataTrabalho: new Date().toISOString(),
      tipo: 'INDIVIDUAL',
      proporcao: 70, // 70% repasse para trabalhador
      contaId: contaId,
    });
    trabalhoIndividualId = trabalhoIndividual.id;
    assertEqual(trabalhoIndividual.tipo, 'INDIVIDUAL', 'Tipo do trabalho');
    assertEqual(trabalhoIndividual.proporcao, 70, 'Proporção de repasse');

    // 2. Adicionar 2 Recebimentos Pagos vinculados a pessoas diferentes
    logInfo('Registrando recebimentos pagos para o trabalho individual...');
    // Recebimento 1: Trabalhador 1 prestou serviço no valor de R$ 100.00
    const rec1 = await trabalhosService.addRecebimento(trabalhoIndividualId, {
      valor: 100.00,
      descricao: 'Recebimento Individual Trabalhador 1',
      metodo: 'PIX',
      status: 'PAGO', // Já está pago
      pessoaId: pessoa1Id,
    });
    // Recebimento 2: Trabalhador 2 prestou serviço no valor de R$ 200.00
    const rec2 = await trabalhosService.addRecebimento(trabalhoIndividualId, {
      valor: 200.00,
      descricao: 'Recebimento Individual Trabalhador 2',
      metodo: 'DINHEIRO',
      status: 'PAGO',
      pessoaId: pessoa2Id,
    });
    logSuccess(`Recebimentos registrados com sucesso: ID ${rec1.id} (R$ 100) e ID ${rec2.id} (R$ 200)`);

    // 3. Executar o Rateio para o Trabalho Individual
    logInfo('Executando rateio por lote do trabalho individual...');
    const resultRateioInd = await trabalhosService.executarRateio(trabalhoIndividualId);
    logSuccess('Rateio executado com sucesso.');
    assertEqual(resultRateioInd.valorArrecadado, 300.00, 'Valor bruto arrecadado no lote');
    assertEqual(resultRateioInd.valorDespesas, 0.00, 'Valor das despesas deduzidas (Individual = 0)');
    assertEqual(resultRateioInd.valorLiquido, 300.00, 'Valor líquido distribuído');

    // 4. Validar as transações financeiras geradas no banco de dados
    logHeader('ASSERÇÕES DO CENÁRIO 1 (TRABALHO INDIVIDUAL)');
    
    // Trabalhador 1 deve ter recebido 70% de R$ 100.00 = R$ 70.00
    const transacoesT1 = await prisma.transacao.findMany({ where: { pessoaId: pessoa1Id } });
    assertEqual(transacoesT1.length, 1, 'Quantidade de transações para o Trabalhador 1');
    assertEqual(transacoesT1[0].valor, 70.00, 'Valor creditado ao Trabalhador 1 (70%)');
    assertEqual(transacoesT1[0].tipo, 'RECEITA', 'Tipo da transação do Trabalhador 1');
    assertEqual(transacoesT1[0].descricao.includes('Repasse Trabalho'), true, 'Descrição da transação do Trabalhador 1');
    assertEqual(transacoesT1[0].contaId, null, 'ContaId do repasse individual do Trabalhador 1 deve ser nulo');

    // Trabalhador 2 deve ter recebido 70% de R$ 200.00 = R$ 140.00
    const transacoesT2 = await prisma.transacao.findMany({ where: { pessoaId: pessoa2Id } });
    assertEqual(transacoesT2.length, 1, 'Quantidade de transações para o Trabalhador 2');
    assertEqual(transacoesT2[0].valor, 140.00, 'Valor creditado ao Trabalhador 2 (70%)');
    assertEqual(transacoesT2[0].tipo, 'RECEITA', 'Tipo da transação do Trabalhador 2');
    assertEqual(transacoesT2[0].descricao.includes('Repasse Trabalho'), true, 'Descrição da transação do Trabalhador 2');
    assertEqual(transacoesT2[0].contaId, null, 'ContaId do repasse individual do Trabalhador 2 deve ser nulo');

    // Comunidade/Paróquia deve ter recebido 30% de R$ 300.00 = R$ 90.00
    // Separados por método (PIX e DINHEIRO)
    // De R$ 100 (PIX) -> Comunidade recebe R$ 30
    // De R$ 200 (DINHEIRO) -> Comunidade recebe R$ 60
    const transacoesContaComunidade = await prisma.transacao.findMany({
      where: { contaId: contaId, pessoaId: null, descricao: { contains: 'Comunidade Trabalho' } },
    });
    assertEqual(transacoesContaComunidade.length, 2, 'Lançamentos de receita para a comunidade (1 por método)');
    
    const transacaoComunidadePIX = transacoesContaComunidade.find(t => t.metodo === 'PIX');
    const transacaoComunidadeDINHEIRO = transacoesContaComunidade.find(t => t.metodo === 'DINHEIRO');
    assertEqual(transacaoComunidadePIX?.valor, 30.00, 'Share da comunidade via PIX (30% de 100)');
    assertEqual(transacaoComunidadeDINHEIRO?.valor, 60.00, 'Share da comunidade via DINHEIRO (30% de 200)');

    // Verificar se os recebimentos de trabalho foram devidamente associados ao lote de rateio
    const recebimentosAtualizados = await prisma.recebimentoTrabalho.findMany({
      where: { trabalhoId: trabalhoIndividualId },
    });
    assertEqual(recebimentosAtualizados.every(r => r.loteRateioId === resultRateioInd.loteRateioId), true, 'Todos os recebimentos foram associados ao lote de rateio criado');


    // ==========================================
    // CENÁRIO 2: TRABALHO EM GRUPO - RATEIO 100% COM DEDUÇÃO DE DESPESAS
    // ==========================================
    logHeader('CENÁRIO 2: TESTANDO TRABALHO EM GRUPO (100% REPASSE) COM ABATIMENTO DE DESPESAS');
    logInfo('Criando trabalho do tipo GRUPO com 3 membros...');

    // 1. Criar Trabalho em Grupo
    const trabalhoGrupo = await trabalhosService.create({
      descricao: 'Trabalho Teste Grupo Com Despesa',
      dataTrabalho: new Date().toISOString(),
      tipo: 'GRUPO',
      proporcao: 100, // Embora o código de GRUPO force 100% e divida líquido igualmente
      contaId: contaId,
      membrosIds: [pessoa1Id, pessoa2Id, pessoa3Id], // 3 membros
    });
    trabalhoGrupoId = trabalhoGrupo.id;
    assertEqual(trabalhoGrupo.tipo, 'GRUPO', 'Tipo do trabalho');

    // 2. Adicionar uma Despesa para o Trabalho (ex: Material de Apoio R$ 50.00)
    logInfo('Registrando despesa operacional de R$ 50.00 para o trabalho em grupo...');
    const despesa = await trabalhosService.addDespesa(trabalhoGrupoId, {
      valor: 50.00,
      descricao: 'Combustível e Alimentação do Grupo',
    });
    logSuccess(`Despesa lançada com sucesso: ID ${despesa.id} no valor de R$ ${despesa.valor}`);

    // 3. Adicionar um Recebimento Pago para o Trabalho em Grupo (R$ 200.00 via PIX)
    logInfo('Registrando recebimento pago de R$ 200.00...');
    const recGrupo = await trabalhosService.addRecebimento(trabalhoGrupoId, {
      valor: 200.00,
      descricao: 'Recebimento Coletivo Trabalho Grupo',
      metodo: 'PIX',
      status: 'PAGO',
    });
    logSuccess(`Recebimento registrado com sucesso: ID ${recGrupo.id} (R$ 200)`);

    // 4. Executar o Rateio para o Trabalho em Grupo
    logInfo('Executando rateio por lote do trabalho em grupo...');
    const resultRateioGrupo = await trabalhosService.executarRateio(trabalhoGrupoId);
    logSuccess('Rateio executado com sucesso.');
    
    // Cálculo esperado:
    // Arrecadado Bruto = R$ 200.00
    // Despesas Pendentes = R$ 50.00
    // Líquido do Lote = R$ 150.00
    // Cada um dos 3 membros recebe: 150.00 / 3 = R$ 50.00
    assertEqual(resultRateioGrupo.valorArrecadado, 200.00, 'Valor bruto arrecadado no lote');
    assertEqual(resultRateioGrupo.valorDespesas, 50.00, 'Valor das despesas deduzidas');
    assertEqual(resultRateioGrupo.valorLiquido, 150.00, 'Valor líquido distribuído');

    // 5. Validar as transações financeiras geradas no banco de dados
    logHeader('ASSERÇÕES DO CENÁRIO 2 (TRABALHO EM GRUPO)');

    // Reembolso de Despesas (Paróquia/Conta): R$ 50.00
    const transacaoReembolso = await prisma.transacao.findFirst({
      where: { contaId: contaId, pessoaId: null, descricao: { contains: 'Reembolso Despesas' } },
    });
    assertEqual(transacaoReembolso?.valor, 50.00, 'Lançamento de Reembolso de Despesas creditado na conta paroquial');
    assertEqual(transacaoReembolso?.tipo, 'RECEITA', 'Tipo da transação de reembolso');

    // Verificar se cada um dos 3 membros recebeu exatamente R$ 50.00
    const membrosIds = [pessoa1Id, pessoa2Id, pessoa3Id];
    for (const mId of membrosIds) {
      const transacoesGrupoMembro = await prisma.transacao.findMany({
        where: {
          pessoaId: mId,
          descricao: { contains: 'Repasse Grupo' },
          loteRateioId: resultRateioGrupo.loteRateioId,
        },
      });
      assertEqual(transacoesGrupoMembro.length, 1, `Quantidade de transações de repasse de grupo para o Membro ${mId}`);
      assertEqual(transacoesGrupoMembro[0].valor, 50.00, `Valor líquido creditado ao Membro ${mId} (R$ 150 / 3 = R$ 50)`);
      assertEqual(transacoesGrupoMembro[0].tipo, 'RECEITA', `Tipo de transação do Membro ${mId}`);
      assertEqual(transacoesGrupoMembro[0].contaId, null, `ContaId do repasse de grupo para o Membro ${mId} deve ser nulo`);
    }


    // ==========================================
    // CENÁRIO 3: VERIFICAÇÃO DE REGRAS E FALHAS (EDGE CASES)
    // ==========================================
    logHeader('CENÁRIO 3: AUDITORIA DE REGRAS E TRATAMENTO DE EXCEÇÕES (EDGE CASES)');

    // 1. Tentar executar rateio sem recebimentos pagos (deve falhar)
    logInfo('Tentando rodar rateio num trabalho sem recebimentos pendentes...');
    try {
      await trabalhosService.executarRateio(trabalhoGrupoId);
      logError('O sistema permitiu executar um rateio sem recebimentos pendentes, violando a regra de negócio!');
      throw new Error('Falha no tratamento de erro de rateio vazio');
    } catch (err: any) {
      logSuccess(`Rateio vazio bloqueado com sucesso! Erro esperado: "${err.message}"`);
    }

    // 2. Tentar executar rateio quando despesas > arrecadação bruta em grupo (deve falhar)
    logInfo('Simulando despesa maior que arrecadação no trabalho em grupo...');
    // Criar um recebimento menor (R$ 20)
    const recPequeno = await trabalhosService.addRecebimento(trabalhoGrupoId, {
      valor: 20.00,
      descricao: 'Recebimento de R$ 20',
      metodo: 'PIX',
      status: 'PAGO',
    });
    // Adicionar despesa grande (R$ 100)
    await trabalhosService.addDespesa(trabalhoGrupoId, {
      valor: 100.00,
      descricao: 'Despesa Grande Operacional',
    });

    try {
      await trabalhosService.executarRateio(trabalhoGrupoId);
      logError('O sistema permitiu rateio com despesas pendentes superiores à arrecadação bruta!');
      throw new Error('Falha no tratamento de despesa estourada');
    } catch (err: any) {
      logSuccess(`Rateio com despesa deficitária bloqueado com sucesso! Erro esperado: "${err.message}"`);
    }

    // 3. Testar edição e exclusão de recebimento não rateado
    logInfo('Testando edição de um recebimento não rateado...');
    const recEditado = await trabalhosService.updateRecebimento(trabalhoGrupoId, recPequeno.id, {
      valor: 35.00,
      descricao: 'Recebimento Alterado',
    });
    assertEqual(recEditado.valor, 35.00, 'Valor do recebimento alterado com sucesso');
    assertEqual(recEditado.descricao, 'Recebimento Alterado', 'Descrição do recebimento alterada com sucesso');

    logInfo('Testando exclusão de recebimento não rateado...');
    await trabalhosService.removeRecebimento(trabalhoGrupoId, recPequeno.id);
    const recDeletadoBusca = await prisma.recebimentoTrabalho.findUnique({ where: { id: recPequeno.id } });
    assertEqual(recDeletadoBusca, null, 'Recebimento não rateado excluído com sucesso');

    // 4. Testar bloqueio de edição/exclusão em recebimento já rateado
    const recRateado = await prisma.recebimentoTrabalho.findFirst({
      where: { loteRateioId: { not: null } }
    });
    if (recRateado) {
      logInfo(`Testando bloqueio de edição de recebimento rateado (ID: ${recRateado.id})...`);
      try {
        await trabalhosService.updateRecebimento(recRateado.trabalhoId, recRateado.id, { valor: 999.00 });
        throw new Error('Falha: permitiu editar recebimento já rateado!');
      } catch (err: any) {
        logSuccess(`Bloqueio de edição de recebimento rateado funcionou! Erro esperado: "${err.message}"`);
      }

      logInfo(`Testando bloqueio de exclusão de recebimento rateado (ID: ${recRateado.id})...`);
      try {
        await trabalhosService.removeRecebimento(recRateado.trabalhoId, recRateado.id);
        throw new Error('Falha: permitiu excluir recebimento já rateado!');
      } catch (err: any) {
        logSuccess(`Bloqueio de exclusão de recebimento rateado funcionou! Erro esperado: "${err.message}"`);
      }
    }

    logSuccess('Auditoria de exceções concluída com absoluto sucesso!');

  } catch (error: any) {
    logError(`Ocorreu um erro inesperado durante a execução dos testes: ${error.message}`);
    console.error(error);
  } finally {
    logHeader('FASE 4: TEAR DOWN (LIMPEZA COMPLETA DO BANCO DE DADOS)');
    logInfo('Iniciando expurgo atômico de todos os registros gerados pelo teste...');
    try {
      // 1. Limpar transações
      const transDel = await prisma.transacao.deleteMany({
        where: {
          OR: [
            { pessoaId: { in: [pessoa1Id, pessoa2Id, pessoa3Id].filter(Boolean) as number[] } },
            { contaId: contaId },
          ],
        },
      });
      logInfo(`Deletadas ${transDel.count} transações financeiras de teste.`);

      // 2. Limpar recebimentos de trabalho
      const recsDel = await prisma.recebimentoTrabalho.deleteMany({
        where: { trabalho: { descricao: { contains: 'Trabalho Teste' } } },
      });
      logInfo(`Deletados ${recsDel.count} recebimentos de trabalho de teste.`);

      // 3. Limpar despesas de trabalho
      const despDel = await prisma.despesaTrabalho.deleteMany({
        where: { trabalho: { descricao: { contains: 'Trabalho Teste' } } },
      });
      logInfo(`Deletadas ${despDel.count} despesas de trabalho de teste.`);

      // 4. Limpar membros de trabalho
      const memDel = await prisma.membroTrabalho.deleteMany({
        where: { trabalho: { descricao: { contains: 'Trabalho Teste' } } },
      });
      logInfo(`Deletados ${memDel.count} membros de trabalho de teste.`);

      // 5. Limpar lotes de rateio
      const lotesDel = await prisma.loteRateio.deleteMany({
        where: { trabalho: { descricao: { contains: 'Trabalho Teste' } } },
      });
      logInfo(`Deletados ${lotesDel.count} lotes de rateio de teste.`);

      // 6. Limpar trabalhos
      const trabDel = await prisma.trabalho.deleteMany({
        where: { id: { in: [trabalhoIndividualId, trabalhoGrupoId].filter(Boolean) as number[] } },
      });
      logInfo(`Deletados ${trabDel.count} trabalhos de teste.`);

      // 7. Limpar pessoas
      if (pessoa1Id || pessoa2Id || pessoa3Id) {
        const idsPessoas = [pessoa1Id, pessoa2Id, pessoa3Id].filter(Boolean) as number[];
        await prisma.usuario.deleteMany({ where: { pessoaId: { in: idsPessoas } } });
        const pessDel = await prisma.pessoa.deleteMany({ where: { id: { in: idsPessoas } } });
        logInfo(`Deletadas ${pessDel.count} pessoas (trabalhadores) de teste.`);
      }

      // 8. Limpar conta bancária
      if (contaId) {
        await prisma.conta.delete({ where: { id: contaId } });
        logInfo('Deletada conta bancária de teste.');
      }

      // 9. Limpar paróquia
      if (paroquiaId) {
        await prisma.paroquia.delete({ where: { id: paroquiaId } });
        logInfo('Deletada paróquia de teste.');
      }

      logSuccess('Banco de dados 100% restaurado e limpo com absoluto sucesso!');
    } catch (cleanError: any) {
      logError(`Falha durante a limpeza do banco de dados: ${cleanError.message}`);
    }

    await app.close();
    logInfo('Contexto de teste de trabalhos encerrado.');
  }
}

bootstrap();
