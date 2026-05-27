import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const url = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== INSPEÇÃO DO BANCO DE DADOS ===');
  
  const contas = await prisma.conta.findMany();
  console.log('\n--- CONTAS FINANCEIRAS ---');
  contas.forEach(c => console.log(`ID: ${c.id} | Nome: ${c.nome} | Saldo: ${c.saldo}`));

  const trabalhos = await prisma.trabalho.findMany({
    include: { conta: true }
  });
  console.log('\n--- TRABALHOS ---');
  trabalhos.forEach(t => {
    console.log(`ID: ${t.id} | Desc: ${t.descricao} | Data: ${t.dataTrabalho.toISOString()} | Tipo: ${t.tipo} | Status: ${t.status} | Conta ID: ${t.contaId} (${t.conta?.nome || 'Nenhuma'})`);
  });

  const lancamentos = await prisma.lancamentoExtrato.findMany({
    include: { conta: true }
  });
  console.log('\n--- LANÇAMENTOS DE EXTRATO (STAGING) ---');
  if (lancamentos.length === 0) {
    console.log('Nenhum lançamento no extrato.');
  } else {
    lancamentos.forEach(l => {
      console.log(`ID: ${l.id} | Data: ${l.data.toISOString()} | Desc: ${l.descricao} | Valor: ${l.valor} | Tipo: ${l.tipo} | Conciliado: ${l.conciliado} | Conta: ${l.conta.nome} (ID: ${l.contaId})`);
    });
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
