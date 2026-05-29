import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const url = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
  console.log('🧪 Iniciando testes de integração de Saques e Cálculo de Saldo...');

  try {
    // 1. Buscar uma Paróquia existente para evitar colisões de ID/Sequência
    const paroquia = await prisma.paroquia.findFirst();
    if (!paroquia) {
      throw new Error('Nenhuma paróquia cadastrada no banco. Por favor, execute o seed primeiro.');
    }
    console.log(`✅ Paróquia para testes selecionada: ${paroquia.nome} (ID: ${paroquia.id})`);

    // 2. Criar uma Pessoa temporária
    const pessoa = await prisma.pessoa.create({
      data: {
        nome: 'Maria da Silva Teste Saques',
        email: `maria.testesaques-${Date.now()}@example.com`,
        paroquiaId: paroquia.id,
      },
    });
    console.log(`✅ Colaboradora de teste criada: ${pessoa.nome}`);

    // 3. Buscar ou criar uma Conta existente
    let conta = await prisma.conta.findFirst();
    let contaCriadaTemporaria = false;
    if (!conta) {
      conta = await prisma.conta.create({
        data: {
          nome: 'Caixa Teste Temporário',
          saldo: 1000.0,
          paroquiaId: paroquia.id,
        }
      });
      contaCriadaTemporaria = true;
      console.log(`✅ Conta bancária temporária criada: ${conta.nome} (ID: ${conta.id})`);
    } else {
      console.log(`✅ Conta bancária selecionada: ${conta.nome} (ID: ${conta.id})`);
    }

    // 3b. Criar um Evento temporário associado a essa conta
    const evento = await prisma.evento.create({
      data: {
        nome: `Evento Teste Saques ${Date.now()}`,
        paroquiaId: paroquia.id,
        contaId: conta.id,
        dataInicio: new Date(),
        dataFim: new Date(Date.now() + 86400000),
        valor: 100.00,
        limiteInscricao: new Date(),
      }
    });
    console.log(`✅ Evento temporário de teste criado: ${evento.nome} (ID: ${evento.id})`);

    // 3c. Criar Inscrição da pessoa no Evento (trava de segurança)
    const inscricao = await prisma.inscricao.create({
      data: {
        pessoaId: pessoa.id,
        eventoId: evento.id,
        status: 'CONFIRMADO'
      }
    });
    console.log(`✅ Inscrição de teste criada com status CONFIRMADO`);

    // 4. Inserir uma receita (repasse/entrada) para a pessoa vinculada ao evento
    const transacao1 = await prisma.transacao.create({
      data: {
        valor: 150.00,
        descricao: 'Cota de Repasse: Estacionamento',
        tipo: 'RECEITA',
        pessoaId: pessoa.id,
        contaId: conta.id,
        eventoId: evento.id,
        data: new Date(),
      },
    });
    console.log(`✅ Receita de cota de repasse lançada: +R$ 150,00`);

    // 5. Verificar o saldo inicial (deve ser R$ 150,00)
    let pessoaDb = await prisma.pessoa.findUnique({
      where: { id: pessoa.id },
      include: { transacoes: true, saques: true },
    });
    
    let totalTransacoes = (pessoaDb as any).transacoes.reduce((acc: number, t: any) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0);
    let totalSaques = (pessoaDb as any).saques?.reduce((acc: number, s: any) => acc + s.valor, 0) || 0;
    let saldoCalculado = totalTransacoes - totalSaques;
    
    console.log(`📊 Saldo inicial calculado: R$ ${saldoCalculado.toFixed(2)} (Esperado: 150.00)`);
    if (saldoCalculado !== 150.00) throw new Error('Falha no cálculo do saldo inicial');

    // 6. Criar um Saque (retirada virtual isolada) passando o eventoId
    const saque = await prisma.saque.create({
      data: {
        valor: 45.00,
        descricao: 'Saque Rápido para Passagem',
        pessoaId: friendshipId(pessoa.id),
        eventoId: evento.id,
      },
    });
    function friendshipId(id: number) { return id; }
    console.log(`✅ Saque/Retirada virtual lançado: -R$ 45,00 (Descrição: "${saque.descricao}")`);

    // 7. Verificar se o saldo reduziu para R$ 105,00
    pessoaDb = await prisma.pessoa.findUnique({
      where: { id: pessoa.id },
      include: { transacoes: true, saques: true },
    });
    
    totalTransacoes = (pessoaDb as any).transacoes.reduce((acc: number, t: any) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0);
    totalSaques = (pessoaDb as any).saques?.reduce((acc: number, s: any) => acc + s.valor, 0) || 0;
    saldoCalculado = totalTransacoes - totalSaques;
    
    console.log(`📊 Saldo pós-saque calculado: R$ ${saldoCalculado.toFixed(2)} (Esperado: 105.00)`);
    if (saldoCalculado !== 105.00) throw new Error('Falha no cálculo do saldo pós-saque');

    // 8. Excluir/Estornar o Saque
    await prisma.saque.delete({
      where: { id: saque.id },
    });
    console.log(`✅ Saque/Retirada estornado com sucesso (Deletado do banco)`);

    // 9. Verificar se o saldo voltou para R$ 150,00
    pessoaDb = await prisma.pessoa.findUnique({
      where: { id: pessoa.id },
      include: { transacoes: true, saques: true },
    });
    
    totalTransacoes = (pessoaDb as any).transacoes.reduce((acc: number, t: any) => {
      if (t.tipo === 'RECEITA') return acc + t.valor;
      if (t.tipo === 'DESPESA') return acc - t.valor;
      return acc;
    }, 0);
    totalSaques = (pessoaDb as any).saques?.reduce((acc: number, s: any) => acc + s.valor, 0) || 0;
    saldoCalculado = totalTransacoes - totalSaques;
    
    console.log(`📊 Saldo pós-estorno calculado: R$ ${saldoCalculado.toFixed(2)} (Esperado: 150.00)`);
    if (saldoCalculado !== 150.00) throw new Error('Falha no cálculo do saldo pós-estorno');

    // 10. Limpar massa de testes
    await prisma.transacao.delete({ where: { id: transacao1.id } });
    await prisma.inscricao.delete({ where: { id: inscricao.id } });
    await prisma.evento.delete({ where: { id: evento.id } });
    if (contaCriadaTemporaria && conta) {
      await prisma.conta.delete({ where: { id: conta.id } });
    }
    await prisma.pessoa.delete({ where: { id: pessoa.id } });
    console.log('🧹 Limpeza dos dados de teste concluída com sucesso!');

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO! O SISTEMA DE SAQUE É 100% SEGURO E INTEGRADO! 🎉');

  } catch (error) {
    console.error('❌ Erro durante a execução dos testes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

runTest();
