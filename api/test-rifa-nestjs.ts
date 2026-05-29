import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { RifasService } from './src/rifas/rifas.service';

async function bootstrap() {
  console.log('=== TESTANDO RIFAS SERVICE COM STACK TRACE DO NESTJS ===\n');
  const app = await NestFactory.createApplicationContext(AppModule);
  const rifasService = app.get(RifasService);

  // Simular o usuário admin que o login retorna
  const adminUser = {
    id: 1,
    login: 'admin@admin.com',
    papel: 'ADMIN',
    pessoaId: 1,
    paroquiaId: 1
  };

  try {
    console.log('Chamando listarTodas(admin)...');
    const result = await rifasService.listarTodas(adminUser);
    console.log('✅ Sucesso! Retornou:', result.length, 'rifas.');
  } catch (err: any) {
    console.error('❌ ERRO CAPTURADO COM STACK TRACE:');
    console.error(err);
  }

  await app.close();
}

bootstrap().catch(err => console.error(err));
