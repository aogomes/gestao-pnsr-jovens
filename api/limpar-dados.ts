import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpeza de dados...');

  console.log('Limpando Bilhetes...');
  await prisma.bilhete.deleteMany({});
  
  console.log('Limpando Alocações de Rifa...');
  await prisma.alocacaoRifa.deleteMany({});
  
  console.log('Limpando Prêmios...');
  await prisma.premio.deleteMany({});
  
  console.log('Limpando Rifas...');
  await prisma.rifa.deleteMany({});
  
  console.log('Limpando Transações (Movimentações)...');
  await prisma.transacao.deleteMany({});

  console.log('Resetando saldo das Contas para 0...');
  await prisma.conta.updateMany({ data: { saldo: 0 } });



  console.log('Limpeza concluída com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
