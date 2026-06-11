require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function test() {
  const url = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: url,
    min: 1,
    max: 2,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    const rifas = await prisma.rifa.findMany({
      include: {
        premios: true,
        evento: {
          include: { paroquia: true, conta: true }
        },
        alocacoes: {
          include: { pessoa: true }
        },
        _count: {
          select: { bilhetes: true }
        }
      },
      orderBy: { criadoEm: 'desc' }
    });
    console.log('RIFAS COUNT:', rifas.length);
  } catch (err) {
    console.error('ERROR RIFAS:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
