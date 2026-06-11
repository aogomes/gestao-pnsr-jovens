const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const user = await prisma.usuario.findFirst();
    console.log('USER OK', user);
    const rifas = await prisma.rifa.findMany({ include: { premios: true, evento: { include: { paroquia: true, conta: true } } } });
    console.log('RIFAS OK', rifas.length);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
