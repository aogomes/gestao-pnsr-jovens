import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsuariosService } from './src/usuarios/usuarios.service';
import { PrismaService } from './src/prisma/prisma.service';
import { PapelUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const usuariosService = app.get(UsuariosService);

  console.log('Semeando dados iniciais...');

  try {
    // 1. Paróquia
    const paroquia = await prisma.paroquia.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        nome: 'Paróquia Santo Antônio',
        paroco: 'Padre João',
        cidade: 'Brasília',
      },
    });

    // 2. Pessoa para Admin
    const pessoaAdmin = await prisma.pessoa.upsert({
      where: { email: 'admin@admin.com' },
      update: {},
      create: {
        nome: 'Administrador',
        email: 'admin@admin.com',
        paroquiaId: paroquia.id,
      },
    });

    // 3. Pessoa para Usuário
    const pessoaUsuario = await prisma.pessoa.upsert({
      where: { email: 'usuario@usuario.com' },
      update: {},
      create: {
        nome: 'Usuário Comum',
        email: 'usuario@usuario.com',
        paroquiaId: paroquia.id,
      },
    });

    // 4. Usuários
    await prisma.usuario.upsert({
      where: { login: 'admin@admin.com' },
      update: { 
        pessoaId: pessoaAdmin.id,
        papel: PapelUsuario.ADMIN 
      },
      create: {
        login: 'admin@admin.com',
        senha: await bcrypt.hash('admin', await bcrypt.genSalt()),
        papel: PapelUsuario.ADMIN,
        pessoaId: pessoaAdmin.id,
      },
    });
    console.log('✅ Admin criado/atualizado: admin@admin.com / admin');

    await prisma.usuario.upsert({
      where: { login: 'usuario@usuario.com' },
      update: { 
        pessoaId: pessoaUsuario.id,
        papel: PapelUsuario.USUARIO
      },
      create: {
        login: 'usuario@usuario.com',
        senha: await bcrypt.hash('usuario', await bcrypt.genSalt()),
        papel: PapelUsuario.USUARIO,
        pessoaId: pessoaUsuario.id,
      },
    });
    console.log('✅ Usuário criado/atualizado: usuario@usuario.com / usuario');

  } catch (e: any) {
    console.error('❌ Erro no seed:', e.message);
  }

  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
