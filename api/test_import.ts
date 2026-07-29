import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const count = await prisma.pessoa.count({
    where: { paroquia: { nome: 'Paróquia Nossa Senhora do Rosário' } }
  });
  
  const sample = await prisma.pessoa.findFirst({
    where: { paroquia: { nome: 'Paróquia Nossa Senhora do Rosário' } }
  });
  
  console.log(`Total Pessoas importadas: ${count}`);
  console.log(`Sample:`, sample);
  
  await app.close();
}

bootstrap();
