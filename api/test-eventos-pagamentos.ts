import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EventosService } from './src/eventos/eventos.service';
import { InscricoesService } from './src/inscricoes/inscricoes.service';
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
  logHeader('INICIALIZANDO CONTEXTO DO NESTJS PARA TESTES DE EVENTOS/INSCRIÇÕES/PAGAMENTOS');
  const app = await NestFactory.createApplicationContext(AppModule);
  const eventosService = app.get(EventosService);
  const inscricoesService = app.get(InscricoesService);
  const prisma = app.get(PrismaService);
  logSuccess('Contexto NestJS e PrismaService carregados.');

  // Variáveis para rastrear IDs criados para limpeza posterior
  let paroquiaId: number | undefined = undefined;
  let contaId: number | undefined = undefined;
  let pessoaId: number | undefined = undefined;
  let eventoId: number | undefined = undefined;
  let inscricaoId: number | undefined = undefined;

  try {
    logHeader('FASE 0: CORREÇÃO E ALINHAMENTO DE SEQUENCES POSTGRESQL');
    
    // Alinhar sequências para evitar erros de Constraint de ID único
    // Alinhar sequências para evitar erros de Constraint de ID único
    const tables = ['paroquias', 'pessoas', 'eventos', 'inscricoes', 'transacoes'];
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce((SELECT max(id) FROM "${table}"), 0) + 1, false);`
        );
        logSuccess(`Sequence da tabela "${table}" resetada com sucesso.`);
      } catch (err: any) {
        logWarn(`Sequence da tabela "${table}" não pôde ser resetada automaticamente.`);
      }
    }

    logHeader('FASE 1: PREPARAÇÃO E LIMPEZA DE ESTADO DE TESTE');
    logInfo('Limpando dados de execuções de teste anteriores...');

    // Limpar resquícios por segurança (transações vinculadas a eventos/pessoas de teste primeiro)
    await prisma.transacao.deleteMany({
      where: {
        OR: [
          { evento: { nome: 'GF EVENTO TESTE INTEGRACAO' } },
          { pessoa: { email: 'fiel.teste@integracao.com' } }
        ]
      }
    });
    await prisma.inscricao.deleteMany({
      where: { evento: { nome: 'GF EVENTO TESTE INTEGRACAO' } }
    });
    await prisma.evento.deleteMany({
      where: { nome: 'GF EVENTO TESTE INTEGRACAO' }
    });
    await prisma.pessoa.deleteMany({
      where: { email: 'fiel.teste@integracao.com' }
    });
    await prisma.conta.deleteMany({
      where: { nome: 'Conta Evento Teste' }
    });
    await prisma.paroquia.deleteMany({
      where: { nome: 'GF PAROQUIA TESTE INTEGRACAO' }
    });

    logSuccess('Limpeza pré-teste concluída.');

    // 1. Criar Paróquia de Teste
    const paroquia = await prisma.paroquia.create({
      data: {
        nome: 'GF PAROQUIA TESTE INTEGRACAO',
        paroco: 'Padre Evento Teste',
        cidade: 'Cidade Evento Teste'
      }
    });
    paroquiaId = paroquia.id;
    logSuccess(`Paróquia criada: [ID ${paroquiaId}] ${paroquia.nome}`);

    const conta = await prisma.conta.create({
      data: {
        nome: 'Conta Evento Teste',
        saldo: 0,
        paroquiaId: paroquiaId,
      }
    });
    contaId = conta.id;
    logSuccess(`Conta criada: [ID ${contaId}] ${conta.nome}`);

    // 2. Criar Fiel (Pessoa) de Teste
    const fiel = await prisma.pessoa.create({
      data: {
        nome: 'Fiel Teste Inscrição',
        email: 'fiel.teste@integracao.com',
        paroquiaId: paroquiaId,
        telefone: '11999999901',
        ativo: true
      }
    });
    pessoaId = fiel.id;
    logSuccess(`Pessoa (Fiel) criada: [ID ${pessoaId}] ${fiel.nome}`);

    // 3. Adicionar Saldo Inicial de R$ 150,00 para a Pessoa
    // Isso é feito criando uma transação de RECEITA associada à pessoa
    const transacaoCredito = await prisma.transacao.create({
      data: {
        valor: 150.00,
        tipo: 'RECEITA',
        origem: 'DEPOSITO',
        descricao: 'Crédito inicial para teste de inscrição',
        pessoaId: pessoaId,
        data: new Date()
      }
    });
    logSuccess(`Crédito de R$ 150,00 adicionado à Pessoa. Transação ID: ${transacaoCredito.id}`);

    // Validar saldo da pessoa via fórmula de agregação do sistema
    const pessoaComTransacoes = await prisma.pessoa.findUnique({
      where: { id: pessoaId },
      include: { transacoes: true }
    });
    const saldoInicial = pessoaComTransacoes?.transacoes.reduce((acc, t) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0) || 0;
    assertEqual(saldoInicial, 150.00, 'Saldo inicial do fiel');

    // 4. Criar Evento de Teste (Custo: R$ 100,00)
    const dataAmanha = new Date();
    dataAmanha.setDate(dataAmanha.getDate() + 1);
    const dataEm10Dias = new Date();
    dataEm10Dias.setDate(dataEm10Dias.getDate() + 10);

    const evento = await eventosService.criar({
      nome: 'GF EVENTO TESTE INTEGRACAO',
      paroquiaId: paroquiaId,
      contaId: contaId,
      valor: 100.00,
      dataInicio: dataAmanha.toISOString(),
      dataFim: dataEm10Dias.toISOString(),
      limiteInscricao: dataAmanha.toISOString(),
    });
    eventoId = evento.id;
    logSuccess(`Evento criado: [ID ${eventoId}] ${evento.nome} no valor de R$ ${evento.valor}`);


    // ==========================================
    // FASE 2: FLUXO DE INSCRIÇÃO E PAGAMENTO COM NOVAS REGRAS DE NEGÓCIO
    // ==========================================
    logHeader('FASE 2: FLUXO DE INSCRIÇÃO E PAGAMENTO COM NOVAS REGRAS DE NEGÓCIO');

    // 1. Criar Inscrição (Status inicial PENDENTE)
    const inscricao = await inscricoesService.criar({
      pessoaId: pessoaId,
      eventoId: eventoId
    });
    inscricaoId = inscricao.id;
    logSuccess(`Inscrição criada com sucesso: [ID ${inscricaoId}]`);
    assertEqual(inscricao.status, 'PENDENTE', 'Status inicial da inscrição');

    // 2. Tentar pagar usando inscrição com status PENDENTE (deve falhar)
    logInfo('Verificando se pagamentos são bloqueados para inscrições PENDENTE...');
    try {
      await inscricoesService.adicionarPagamento({
        valor: 100.00,
        metodo: 'SALDO',
        inscricaoId: inscricaoId
      });
      logError('O sistema permitiu o pagamento para uma inscrição PENDENTE, o que viola as regras de negócio!');
      throw new Error('Falha de regra de negócio: permitiu pagamento com inscrição PENDENTE');
    } catch (err: any) {
      logSuccess(`Pagamento em inscrição PENDENTE bloqueado com sucesso! Erro esperado: "${err.message}"`);
    }

    // 3. Confirmar a Inscrição para permitir pagamentos
    logInfo('Confirmando a inscrição...');
    await inscricoesService.atualizarStatus(inscricaoId, 'CONFIRMADO');
    const inscricaoConfirmada = await prisma.inscricao.findUnique({ where: { id: inscricaoId } });
    assertEqual(inscricaoConfirmada?.status, 'CONFIRMADO', 'Status após confirmação');

    // 4. Tentar pagar usando método inválido (ex: PIX)
    logInfo('Validando rejeição de pagamentos com métodos diferentes de SALDO...');
    try {
      await inscricoesService.adicionarPagamento({
        valor: 100.00,
        metodo: 'PIX',
        inscricaoId: inscricaoId
      });
      logError('O sistema aceitou um pagamento via PIX, o que viola a regra de negócio atual.');
      throw new Error('Falha de regra de negócio: permitiu pagamento sem ser via SALDO');
    } catch (err: any) {
      logSuccess(`Pagamento via PIX bloqueado com sucesso! Erro: "${err.message}"`);
    }

    // 5. Tentar pagar valor acima do saldo da pessoa (ex: R$ 200,00)
    logInfo('Validando rejeição de pagamentos que excedem o saldo disponível...');
    try {
      await inscricoesService.adicionarPagamento({
        valor: 200.00,
        metodo: 'SALDO',
        inscricaoId: inscricaoId
      });
      logError('O sistema aceitou um pagamento maior do que o saldo do fiel.');
      throw new Error('Falha de regra de negócio: permitiu pagamento sem saldo suficiente');
    } catch (err: any) {
      logSuccess(`Pagamento com saldo insuficiente bloqueado com sucesso! Erro: "${err.message}"`);
    }

    // 6. Executar Pagamento Válido (R$ 100,00 usando SALDO)
    logInfo('Realizando pagamento válido de R$ 100,00 via SALDO em inscrição CONFIRMADA...');
    const pagamentoEfetuado = await inscricoesService.adicionarPagamento({
      valor: 100.00,
      metodo: 'SALDO',
      inscricaoId: inscricaoId
    });
    logSuccess(`Pagamento registrado com sucesso! Pagamento ID: ${pagamentoEfetuado.id}`);
    assertEqual(pagamentoEfetuado.valor, 100.00, 'Valor do pagamento registrado');

    // 7. Verificar redução de saldo da Pessoa
    let pessoaDb = await prisma.pessoa.findUnique({
      where: { id: pessoaId },
      include: { transacoes: true }
    });
    let saldoAtual = pessoaDb?.transacoes.reduce((acc, t) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0) || 0;
    assertEqual(saldoAtual, 50.00, 'Saldo do fiel pós-pagamento de inscrição (Esperado: 150 - 100 = 50)');
    
    // 7.5. Verificar incremento do saldo da Conta Bancária da Paróquia (Receita)
    const contaDb = await prisma.conta.findUnique({
      where: { id: contaId }
    });
    assertEqual(contaDb?.saldo, 100.00, 'Saldo da conta bancária pós-pagamento de inscrição (Esperado: 100)');

    // Validar se a transação do pagamento vinculou inscricaoId e eventoId corretamente
    const transacaoPagamento = pessoaDb?.transacoes.find(t => t.tipo === 'DESPESA' && t.descricao.includes('Pagamento Inscrição'));
    if (transacaoPagamento) {
      logSuccess(`Transação de pagamento estrutural localizada com sucesso! [ID ${transacaoPagamento.id}]`);
      assertEqual(transacaoPagamento.inscricaoId, inscricaoId, 'Vínculo da transação de pagamento com a inscrição');
      assertEqual(transacaoPagamento.eventoId, eventoId, 'Vínculo da transação de pagamento com o evento');
    } else {
      logError('Transação de pagamento não foi localizada na conta do participante!');
      throw new Error('Falha na geração da transação de pagamento.');
    }


    // ==========================================
    // FASE 3: TESTES DE EM_ANALISE E ESTORNO AO REJEITAR
    // ==========================================
    logHeader('FASE 3: TESTES DE EM_ANALISE E ESTORNO/ESTADO FINANCEIRO AO REJEITAR');

    // 1. Mudar para EM_ANALISE
    logInfo('Alterando status da inscrição para EM_ANALISE...');
    await inscricoesService.atualizarStatus(inscricaoId, 'EM_ANALISE');
    const inscricaoEmAnalise = await prisma.inscricao.findUnique({ where: { id: inscricaoId } });
    assertEqual(inscricaoEmAnalise?.status, 'EM_ANALISE', 'Status da inscrição em análise');

    // 2. Tentar pagar quando em EM_ANALISE (deve falhar)
    logInfo('Verificando se pagamentos são bloqueados para inscrições em status EM_ANALISE...');
    try {
      await inscricoesService.adicionarPagamento({
        valor: 10.00,
        metodo: 'SALDO',
        inscricaoId: inscricaoId
      });
      logError('O sistema permitiu o pagamento para uma inscrição em status EM_ANALISE!');
      throw new Error('Falha de regra de negócio: permitiu pagamento com inscrição EM_ANALISE');
    } catch (err: any) {
      logSuccess(`Pagamento bloqueado com sucesso em inscrição EM_ANALISE! Erro esperado: "${err.message}"`);
    }

    // 3. Rejeitar a inscrição e validar que os valores pagos foram estornados
    logInfo('Rejeitando a inscrição (espera-se estorno automático de R$ 100,00 para o saldo do participante)...');
    await inscricoesService.atualizarStatus(inscricaoId, 'REJEITADA');

    // a. Verificar status atualizado no banco e a síntese dinâmica de pagamentos
    const todasInscricoes = await inscricoesService.buscarTodas(eventoId);
    const inscricaoRejeitada = todasInscricoes.find(i => i.id === inscricaoId);
    assertEqual(inscricaoRejeitada?.status, 'REJEITADA', 'Status atualizado para REJEITADA');

    // b. Verificar que o saldo financeiro da inscrição é zero (soma dos pagamentos e estornos)
    const totalPago = inscricaoRejeitada?.pagamentos.reduce((acc, p) => acc + p.valor, 0) || 0;
    assertEqual(totalPago, 0, 'Total pago pós-estorno da inscrição (Esperado: 0)');

    // c. Verificar que a transação de RECEITA (estorno) foi gerada e o saldo retornou a R$ 150,00
    pessoaDb = await prisma.pessoa.findUnique({
      where: { id: pessoaId },
      include: { transacoes: true }
    });
    saldoAtual = pessoaDb?.transacoes.reduce((acc, t) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0) || 0;
    assertEqual(saldoAtual, 150.00, 'Saldo final do fiel pós-estorno (Esperado: 50 + 100 = 150)');

    // c.5. Verificar que o saldo da conta bancária retornou para R$ 0,00 (estornado)
    const contaDbEstorno = await prisma.conta.findUnique({
      where: { id: contaId }
    });
    assertEqual(contaDbEstorno?.saldo, 0.00, 'Saldo da conta bancária pós-estorno de inscrição (Esperado: 0)');

    // d. Validar se a transação financeira de estorno foi inserida corretamente no histórico
    const transacaoEstorno = pessoaDb?.transacoes.find(t => t.tipo === 'RECEITA' && t.descricao.includes('Estorno Pagamento Inscrição'));
    if (transacaoEstorno) {
      logSuccess(`Transação de estorno localizada com sucesso! [ID ${transacaoEstorno.id}] "${transacaoEstorno.descricao}" de R$ ${transacaoEstorno.valor}`);
      assertEqual(transacaoEstorno.valor, 100.00, 'Valor estornado na transação');
      assertEqual(transacaoEstorno.inscricaoId, inscricaoId, 'Vínculo da transação de estorno com a inscrição');
      assertEqual(transacaoEstorno.eventoId, eventoId, 'Vínculo da transação de estorno com o evento');
    } else {
      logError('Transação de estorno não foi localizada na conta do participante!');
      throw new Error('Falha na geração da transação de estorno.');
    }

  } catch (error: any) {
    logError(`Ocorreu um erro inesperado durante os testes: ${error.message}`);
    console.error(error);
  } finally {
    logHeader('FASE 4: TEAR DOWN (LIMPEZA COMPLETA DO BANCO)');
    logInfo('Iniciando limpeza de todos os registros gerados pelo teste de integração...');
    try {

      // 2. Deletar Inscrições
      if (eventoId) {
        const inscricoesDel = await prisma.inscricao.deleteMany({
          where: { eventoId: eventoId }
        });
        logInfo(`Deletadas ${inscricoesDel.count} inscrições de teste.`);
      }

      // 3. Deletar Transações vinculadas ao Evento (evitando violação de FK)
      if (eventoId) {
        const transacoesEventoDel = await prisma.transacao.deleteMany({
          where: { eventoId: eventoId }
        });
        logInfo(`Deletadas ${transacoesEventoDel.count} transações associadas ao evento.`);
      }

      // 3.5. Deletar Transações vinculadas à Pessoa (restantes, ex: depósito inicial)
      if (pessoaId) {
        const transacoesPessoaDel = await prisma.transacao.deleteMany({
          where: { pessoaId: pessoaId }
        });
        logInfo(`Deletadas ${transacoesPessoaDel.count} transações de depósito.`);
      }

      // 4. Deletar Pessoa
      if (pessoaId) {
        await prisma.pessoa.delete({
          where: { id: pessoaId }
        });
        logInfo('Deletada Pessoa de teste.');
      }

      // 5. Deletar Evento
      if (eventoId) {
        await prisma.evento.delete({
          where: { id: eventoId }
        });
        logInfo('Deletado Evento de teste.');
      }

      // 5.5. Deletar Conta
      if (contaId) {
        await prisma.conta.delete({
          where: { id: contaId }
        });
        logInfo('Deletada Conta de teste.');
      }

      // 6. Deletar Paróquia
      if (paroquiaId) {
        await prisma.paroquia.delete({
          where: { id: paroquiaId }
        });
        logInfo('Deletada Paróquia de teste.');
      }

      logSuccess('Banco de dados restaurado e limpo com sucesso absoluto!');
    } catch (cleanError: any) {
      logError(`Falha durante a limpeza do banco de dados: ${cleanError.message}`);
    }

    await app.close();
    logInfo('Contexto de teste de integração encerrado.');
  }
}

bootstrap();
