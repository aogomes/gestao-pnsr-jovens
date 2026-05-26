import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { RifasService } from './src/rifas/rifas.service';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const rifasService = app.get(RifasService);
  const prisma = app.get(PrismaService);

  console.log('Iniciando seed de rifa de teste...');

  // 1. Buscar pessoas disponíveis
  const pessoas = await prisma.pessoa.findMany({ take: 2 });
  if (pessoas.length === 0) {
    console.log('Nenhuma pessoa encontrada.');
    await app.close();
    return;
  }

  // 2. Criar a Rifa via serviço
  try {
    const rifa = await rifasService.criar({
      nome: 'Rifa de Inverno 2026',
      descricao: 'Campanha para arrecadação de fundos para a reforma do salão paroquial.',
      dataInicio: new Date(),
      dataFim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dataSorteio: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      valorNumero: 15.0,
      totalNumeros: 500,
      numerosPorCartela: 50,
      premioVendedor: 'Vale Jantar para 2 pessoas (Rodízio)',
      premios: [
        { descricao: 'Iphone 15 Pro Max', posicao: 1 },
        { descricao: 'Smart TV 65" 4K', posicao: 2 },
        { descricao: 'Bicicleta Aro 29', posicao: 3 },
      ]
    }, { papel: 'ADMIN', paroquiaId: null });

    console.log(`✅ Rifa criada: ${rifa.nome}`);

    // 3. Alocar Cartelas para as pessoas encontradas
    for (const pessoa of pessoas) {
      await rifasService.alocarCartela({
        rifaId: rifa.id,
        pessoaId: pessoa.id,
        quantidade: 50
      });
      console.log(`✅ Alocados 50 números para: ${pessoa.nome}`);
    }

    console.log('🚀 Seed de rifa concluído com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro no seed:', error.message);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
