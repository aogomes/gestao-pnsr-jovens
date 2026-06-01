import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const transacoesLote5 = await prisma.transacao.findMany({
    where: { loteRateioId: 5 }
  });
  
  console.log("Transacoes para Lote 5:");
  console.log(JSON.stringify(transacoesLote5, null, 2));

  await app.close();
}

bootstrap();
