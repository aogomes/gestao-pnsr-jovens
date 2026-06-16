const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.rifa.count();
  console.log('Total Rifas:', count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
