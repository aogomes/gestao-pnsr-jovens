import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const pid = 38; // DANIEL
  const p = await prisma.pessoa.findUnique({ where: { id: pid }});
  
  console.log(`Analisando Pessoa: ${p?.nome}`);
  
  const transacoes = await prisma.transacao.findMany({
    where: { 
      tipo: 'RECEITA', 
      origem: 'TRABALHO',
      pessoaId: pid
    },
    include: {
      loteRateio: { include: { trabalho: true } }
    }
  });

  console.log("== TRANSACOES OFICIAIS (RATEADAS) ==");
  let somaTrans = 0;
  transacoes.forEach(t => {
    somaTrans += t.valor;
    console.log(`Transacao ID ${t.id} - Valor: ${t.valor} - Lote: ${t.loteRateioId} - Trabalho: ${t.loteRateio?.trabalho?.descricao}`);
  });
  console.log(`Total Transacoes: ${somaTrans}`);

  const trabalhos = await prisma.trabalho.findMany({
    where: {
      OR: [
        { pessoaId: pid },
        { membros: { some: { pessoaId: pid } } }
      ]
    },
    include: {
      recebimentos: { where: { status: 'PAGO' } },
      despesas: true,
      membros: true
    }
  });

  console.log("\n== TRABALHOS (CALCULADO PELA TELA DE PRE-VISUALIZACAO) ==");
  let somaTrab = 0;
  trabalhos.forEach(t => {
    const totalPago = t.recebimentos.reduce((acc, r) => acc + r.valor, 0);
    const totalDesp = t.despesas.reduce((acc, d) => acc + d.valor, 0);
    let ganho = 0;
    if (t.tipo === 'INDIVIDUAL') {
      const recsPessoais = t.recebimentos.filter(r => (r.pessoaId || t.pessoaId) === pid);
      const sumRecs = recsPessoais.reduce((acc, r) => acc + r.valor, 0);
      ganho = sumRecs * (t.proporcao / 100);
    } else {
      const valorLiquido = Math.max(0, totalPago - totalDesp);
      ganho = valorLiquido / t.membros.length;
    }
    somaTrab += ganho;
    console.log(`Trabalho ID ${t.id} ("${t.descricao}") - Ganho Calculado: ${ganho.toFixed(2)} - Total Recebimentos Pagos: ${totalPago}`);
  });
  console.log(`Total Trabalhos Calculado: ${somaTrab}`);
  
  await app.close();
}

bootstrap();
