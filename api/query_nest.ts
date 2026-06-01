import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const trabalhos = await prisma.trabalho.findMany({
    include: {
      recebimentos: {
        where: {
          status: 'PAGO',
          loteRateioId: null
        }
      }
    }
  });

  const trabalhosPendentes = trabalhos.filter(t => t.recebimentos.length > 0);
  if (trabalhosPendentes.length === 0) {
    console.log("Nenhum trabalho com recebimentos PAGO aguardando rateio.");
  } else {
    trabalhosPendentes.forEach(t => {
      const totalPendente = t.recebimentos.reduce((acc, r) => acc + r.valor, 0);
      console.log(`- Trabalho ID: ${t.id} ("${t.descricao}") => Valor Pendente: R$ ${totalPendente.toFixed(2)}`);
    });
  }
  
  await app.close();
}

bootstrap();
