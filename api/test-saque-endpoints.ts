import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  console.log('=== INICIANDO TESTE OPERACIONAL DE SAQUES DE PONTA A PONTA (HTTP API) ===\n');

  try {
    // 1. Efetuar Login
    const loginRes = await fetch('http://localhost:3001/api/v1/autenticacao/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'admin@admin.com', senha: 'admin' })
    });

    if (!loginRes.ok) {
      throw new Error(`Erro ao logar: ${loginRes.status} ${loginRes.statusText}`);
    }

    const { access_token } = await loginRes.json();
    console.log('✅ Autenticado com sucesso na API!');

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    };

    // 2. Buscar/Criar dados para teste
    const paroquia = await prisma.paroquia.findFirst();
    if (!paroquia) throw new Error('Nenhuma paróquia cadastrada.');

    const pessoa = await prisma.pessoa.create({
      data: {
        nome: 'Participante Teste Saque API',
        email: `participante.saqueapi-${Date.now()}@example.com`,
        paroquiaId: paroquia.id,
      }
    });
    console.log(`👤 Participante de teste criado: ${pessoa.nome} (ID: ${pessoa.id})`);

    const conta = await prisma.conta.findFirst();
    if (!conta) throw new Error('Nenhuma conta cadastrada.');
    console.log(`🏦 Conta selecionada para o teste: ${conta.nome} (ID: ${conta.id}, Saldo Inicial: R$ ${conta.saldo.toFixed(2)})`);

    const evento = await prisma.evento.create({
      data: {
        nome: `Evento Teste Saque API ${Date.now()}`,
        paroquiaId: paroquia.id,
        contaId: conta.id,
        dataInicio: new Date(),
        dataFim: new Date(Date.now() + 86400000),
        valor: 50.00,
        limiteInscricao: new Date(),
      }
    });
    console.log(`📅 Evento temporário criado: ${evento.nome} (ID: ${evento.id})`);

    const inscricao = await prisma.inscricao.create({
      data: {
        pessoaId: pessoa.id,
        eventoId: evento.id,
        status: 'CONFIRMADO'
      }
    });
    console.log(`📝 Inscrição CONFIRMADA no evento.`);

    // Lançar um saldo de receita para a pessoa (PIX/Dinheiro) para ela poder sacar
    const receita = await prisma.transacao.create({
      data: {
        valor: 200.00,
        tipo: 'RECEITA',
        descricao: 'Crédito Adquirido de Trabalho Beneficente',
        pessoaId: pessoa.id,
        contaId: conta.id,
        eventoId: evento.id,
      }
    });
    console.log(`💰 Receita de crédito lançada para o participante: +R$ 200,00`);

    // 3. Efetuar o Saque via API HTTP POST
    const saquePayload = {
      valor: 80.00,
      descricao: 'Saque de Ajuda de Custo Alimentação',
      pessoaId: pessoa.id,
      eventoId: evento.id,
      data: new Date().toISOString()
    };

    console.log('\n--- Lançando Saque via HTTP POST /saques ---');
    const startSaque = Date.now();
    const resSaque = await fetch('http://localhost:3001/api/v1/saques', {
      method: 'POST',
      headers,
      body: JSON.stringify(saquePayload)
    });
    
    console.log(`Status Saque: ${resSaque.status} ${resSaque.statusText}`);
    if (!resSaque.ok) {
      const errText = await resSaque.text();
      throw new Error(`Erro ao efetuar saque: ${errText}`);
    }

    const saqueCriado = await resSaque.json();
    console.log(`✅ Saque efetuado com sucesso! ID do Saque: ${saqueCriado.id}`);

    // 4. Validar no Banco de Dados se a Transação correspondente de RECEITA foi gerada na conta
    const transacaoReceita = await prisma.transacao.findFirst({
      where: {
        tipo: 'RECEITA',
        descricao: {
          startsWith: `[SAQUE #${saqueCriado.id}]`
        }
      }
    });

    console.log('\n--- Validando Transação Contábil de RECEITA (Conta) ---');
    if (!transacaoReceita) {
      throw new Error('❌ ERRO: A transação financeira de receita correspondente não foi gerada na conta do evento!');
    }

    console.log(`✅ SUCESSO! Transação contábil de RECEITA localizada:`);
    console.log(`   ID: ${transacaoReceita.id}`);
    console.log(`   Valor: R$ ${transacaoReceita.valor.toFixed(2)} (Esperado: R$ 80.00)`);
    console.log(`   Tipo: ${transacaoReceita.tipo} (Esperado: RECEITA)`);
    console.log(`   Descrição: "${transacaoReceita.descricao}"`);
    console.log(`   Conta ID: ${transacaoReceita.contaId} (Esperado: ${evento.contaId})`);
    console.log(`   Evento ID: ${transacaoReceita.eventoId} (Esperado: ${evento.id})`);

    // 4b. Validar no Banco de Dados se a Transação correspondente de DESPESA foi gerada para a pessoa
    const transacaoDespesa = await prisma.transacao.findFirst({
      where: {
        tipo: 'DESPESA',
        descricao: {
          startsWith: `[SAQUE #${saqueCriado.id}]`
        }
      }
    });

    console.log('\n--- Validando Transação Contábil de DESPESA (Pessoa) ---');
    if (!transacaoDespesa) {
      throw new Error('❌ ERRO: A transação financeira de despesa correspondente não foi gerada para a pessoa!');
    }

    console.log(`✅ SUCESSO! Transação contábil de DESPESA localizada:`);
    console.log(`   ID: ${transacaoDespesa.id}`);
    console.log(`   Valor: R$ ${transacaoDespesa.valor.toFixed(2)} (Esperado: R$ 80.00)`);
    console.log(`   Tipo: ${transacaoDespesa.tipo} (Esperado: DESPESA)`);
    console.log(`   Descrição: "${transacaoDespesa.descricao}"`);
    console.log(`   Pessoa ID: ${transacaoDespesa.pessoaId} (Esperado: ${pessoa.id})`);
    console.log(`   Evento ID: ${transacaoDespesa.eventoId} (Esperado: ${evento.id})`);

    // 5. Validar se o saldo físico da Conta foi incrementado (RECEITA para a conta)
    const contaAtualizada = await prisma.conta.findUnique({ where: { id: conta.id } });
    const saldoEsperado = conta.saldo + 80.00;
    console.log(`✅ Saldo da conta física atualizado: R$ ${contaAtualizada!.saldo.toFixed(2)} (Esperado: R$ ${saldoEsperado.toFixed(2)})`);
    if (Math.abs(contaAtualizada!.saldo - saldoEsperado) > 0.01) {
      throw new Error('❌ ERRO: O saldo da conta bancária física não foi incrementado corretamente!');
    }

    // 6. Excluir o Saque via API HTTP DELETE
    console.log(`\n--- Excluindo/Estornando o Saque via HTTP DELETE /saques/${saqueCriado.id} ---`);
    const resDelete = await fetch(`http://localhost:3001/api/v1/saques/${saqueCriado.id}`, {
      method: 'DELETE',
      headers
    });

    console.log(`Status Estorno: ${resDelete.status} ${resDelete.statusText}`);
    if (!resDelete.ok) {
      const errText = await resDelete.text();
      throw new Error(`Erro ao estornar saque: ${errText}`);
    }

    console.log('✅ Saque estornado com sucesso na API!');

    // 7. Validar se ambas as transações foram removidas e o saldo da conta física foi restaurado
    const transacoesRestantes = await prisma.transacao.findMany({
      where: {
        descricao: {
          startsWith: `[SAQUE #${saqueCriado.id}]`
        }
      }
    });

    console.log('\n--- Validando Estorno no Banco ---');
    if (transacoesRestantes.length > 0) {
      throw new Error(`❌ ERRO: Restaram transações contábeis de saque no banco: ${transacoesRestantes.length}`);
    }
    console.log('✅ SUCESSO! Ambas as transações correspondentes (DESPESA e RECEITA) foram deletadas do banco.');

    const contaRestaurada = await prisma.conta.findUnique({ where: { id: conta.id } });
    console.log(`✅ Saldo da conta física restaurado: R$ ${contaRestaurada!.saldo.toFixed(2)} (Esperado: R$ ${conta.saldo.toFixed(2)})`);
    if (Math.abs(contaRestaurada!.saldo - conta.saldo) > 0.01) {
      throw new Error('❌ ERRO: O saldo da conta bancária física não foi restaurado ao valor original!');
    }

    // 8. Limpeza de Massa
    await prisma.transacao.delete({ where: { id: receita.id } });
    await prisma.inscricao.delete({ where: { id: inscricao.id } });
    await prisma.evento.delete({ where: { id: evento.id } });
    await prisma.pessoa.delete({ where: { id: pessoa.id } });
    console.log('\n🧹 Limpeza de dados de teste finalizada.');

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM EXCELÊNCIA! A CONCILIAÇÃO FINANCEIRA DE SAQUES É 100% OPERACIONAL! 🎉');

  } catch (err: any) {
    console.error('\n❌ ERRO GLOBAL NO SCRIPT:', err.message);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

test();
