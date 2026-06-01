import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const pid = 38; // DANIEL
  const p = await prisma.pessoa.findUnique({ where: { id: pid }});
  
  const trabalhos = await prisma.trabalho.findMany({
    include: {
      recebimentos: { where: { status: 'PAGO' } },
      despesas: true,
      membros: true
    }
  });

  console.log("\n== TRABALHOS (CALCULADO PELA TELA DE PRE-VISUALIZACAO) == PARA " + p?.nome);
  let somaTrab = 0;
  trabalhos.forEach(t => {
    const totalPago = t.recebimentos.reduce((acc, r) => acc + r.valor, 0);
    const totalDesp = t.despesas.reduce((acc, d) => acc + d.valor, 0);
    let ganho = 0;
    if (t.tipo === 'INDIVIDUAL') {
      const recsPessoais = t.recebimentos.filter(r => (r.pessoaId || t.pessoaId) === pid);
      if (recsPessoais.length > 0) {
        const sumRecs = recsPessoais.reduce((acc, r) => acc + r.valor, 0);
        ganho = sumRecs * (t.proporcao / 100);
      }
    } else {
      if (t.membros.some(m => m.pessoaId === pid)) {
        const valorLiquido = Math.max(0, totalPago - totalDesp);
        ganho = valorLiquido / t.membros.length;
      }
    }
    
    if (ganho > 0) {
      somaTrab += ganho;
      console.log(`Trabalho ID ${t.id} ("${t.descricao}") - Ganho Calculado: ${ganho.toFixed(2)}`);
    }
  });
  console.log(`Total Trabalhos Calculado: ${somaTrab}`);
  
  await app.close();
}

bootstrap();
