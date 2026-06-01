import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const trabalho = await prisma.trabalho.findUnique({
    where: { id: 15 },
    include: {
      recebimentos: true,
      despesas: true,
      membros: true,
      lotesRateio: true
    }
  });

  console.log(JSON.stringify(trabalho, null, 2));
  
  await app.close();
}

bootstrap();
