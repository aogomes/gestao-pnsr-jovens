const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.htmfkflkslqcisvsoyvf:PCmyZdyPCvixL6vm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres' });
async function run() {
  await client.connect();
  const t = await client.query('SELECT id, tipo, valor, descricao FROM "transacoes" WHERE "contaId" = 6');
  const e = await client.query('SELECT id, tipo, valor, descricao FROM "lancamentos_extrato" WHERE "contaId" = 6');
  console.log('--- MANUAIS ---');
  t.rows.forEach(r => console.log(r.id, r.tipo, r.valor, r.descricao));
  console.log('--- EXTRATO ---');
  e.rows.forEach(r => console.log(r.id, r.tipo, r.valor, r.descricao));
  await client.end();
}
run().catch(console.error);
