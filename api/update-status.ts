import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['info', 'query', 'warn', 'error'] });

async function run() {
  try {
    const res = await prisma.inscricao.updateMany({
      where: { status: 'REJEITADA' },
      data: { status: 'DESISTENCIA' }
    });
    console.log('Updated rows:', res.count);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
