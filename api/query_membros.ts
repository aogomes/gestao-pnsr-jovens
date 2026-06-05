import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const trabalhoId = 15;
  const trabalho = await prisma.trabalho.findUnique({
    where: { id: trabalhoId },
    include: {
      membros: { include: { pessoa: true } }
    }
  });

  console.log(`\nTrabalho: ${trabalho?.descricao}`);
  console.log(`Membros atuais (${trabalho?.membros.length}):`);
  
  for (const membro of trabalho?.membros || []) {
    const transacoes = await prisma.transacao.findMany({
      where: {
        origem: 'TRABALHO',
        pessoaId: membro.pessoaId,
        loteRateio: { trabalhoId: trabalhoId }
      },
      include: { loteRateio: true }
    });
    
    const sum = transacoes.reduce((acc, t) => acc + t.valor, 0);
    console.log(`- ${membro.pessoa.nome}: Total Rateado Oficial = R$ ${sum.toFixed(2)} (${transacoes.length} transações)`);
    for (const t of transacoes) {
      console.log(`   -> Lote ID: ${t.loteRateioId}, Data: ${t.data.toISOString()}, Valor: R$ ${t.valor.toFixed(2)}`);
    }
  }

  await app.close();
}

bootstrap();
