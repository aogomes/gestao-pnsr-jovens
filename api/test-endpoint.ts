async function test() {
  console.log('=== TESTANDO ENDPOINT DE IMPORTAÇÃO PARA TRABALHO ID 6 (26/04/2026) ===');
  try {
    const res = await fetch('http://localhost:3001/api/v1/trabalhos/6/importar-extrato', {
      method: 'POST',
    });
    console.log('Código de Status:', res.status);
    const data = await res.json();
    console.log('Corpo da Resposta:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Erro na requisição:', err);
  }
}

test();
