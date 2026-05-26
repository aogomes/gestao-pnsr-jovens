import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('Semeando dados básicos (Paróquias, Contas, Pessoas)...');

  // 1. Paróquia
  const paroquia = await prisma.paroquia.create({
    data: {
      nome: 'Paróquia Santo Antônio',
      paroco: 'Padre João',
      cidade: 'Brasília',
    },
  });
  console.log('✅ Paróquia criada:', paroquia.nome);

  // 2. Conta
  const conta = await prisma.conta.create({
    data: {
      nome: 'Fundo Paroquial',
      paroquiaId: paroquia.id,
      saldo: 1000,
    },
  });
  console.log('✅ Conta criada:', conta.nome);

  // 3. Pessoas
  const p1 = await prisma.pessoa.create({
    data: {
      nome: 'Alessandro Gomes',
      email: 'alessandro@gmail.com',
      telefone: '61999999999',
      paroquiaId: paroquia.id,

    },
  });

  const p2 = await prisma.pessoa.create({
    data: {
      nome: 'Maria Silva',
      email: 'maria@gmail.com',
      telefone: '61888888888',
      paroquiaId: paroquia.id,

    },
  });

  console.log('✅ Pessoas criadas:', p1.nome, ',', p2.nome);

  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
