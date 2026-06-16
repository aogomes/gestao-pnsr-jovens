const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.htmfkflkslqcisvsoyvf:PCmyZdyPCvixL6vm@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function run() {
  try {
    await client.connect();
    const res = await client.query("UPDATE inscricoes SET status = 'CANCELADO' WHERE status = 'REJEITADA'");
    console.log('Updated rows:', res.rowCount);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
