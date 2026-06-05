import 'dotenv/config';

async function test() {
  console.log('=== TESTANDO ENDPOINTS DA PÁGINA DE TRABALHOS ===\n');

  try {
    const loginRes = await fetch('http://localhost:3001/api/v1/autenticacao/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'admin@admin.com', senha: 'admin' })
    });

    if (!loginRes.ok) {
      throw new Error(`Erro ao logar: ${loginRes.status} ${loginRes.statusText}`);
    }

    const { access_token } = await loginRes.json();
    console.log('✅ Autenticado com sucesso! Token obtido.');

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    };

    const endpoints = [
      { name: '/trabalhos', path: 'http://localhost:3001/api/v1/trabalhos' },
      { name: '/pessoas', path: 'http://localhost:3001/api/v1/pessoas' },
      { name: '/eventos', path: 'http://localhost:3001/api/v1/eventos' },
      { name: '/produtos-venda', path: 'http://localhost:3001/api/v1/produtos-venda' }
    ];

    console.log('\n--- Chamando endpoints em paralelo ---');

    await Promise.all(endpoints.map(async (ep) => {
      try {
        const start = Date.now();
        const res = await fetch(ep.path, { headers });
        const duration = Date.now() - start;
        
        console.log(`\n🔹 Endpoint: ${ep.name} | Duração: ${duration}ms`);
        console.log(`   Status: ${res.status} ${res.statusText}`);
        
        if (!res.ok) {
          const text = await res.text();
          console.error(`   ❌ ERRO RETORNADO:`, text);
        } else {
          const data = await res.json();
          console.log(`   ✅ SUCESSO! Elementos retornados:`, Array.isArray(data) ? data.length : 'Objeto');
        }
      } catch (err: any) {
        console.error(`   ❌ FALHA DE REDE/CONEXÃO em ${ep.name}:`, err.message);
      }
    }));

  } catch (err: any) {
    console.error('❌ ERRO GLOBAL NO SCRIPT:', err.message);
  }
}

test();
