import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const trabalhos = await prisma.trabalho.findMany({
    include: {
      recebimentos: {
        where: {
          status: 'PAGO',
          loteRateioId: null
        }
      }
    }
  });

  const trabalhosPendentes = trabalhos.filter(t => t.recebimentos.length > 0);

  if (trabalhosPendentes.length === 0) {
    console.log("Nenhum trabalho com recebimentos PAGO aguardando rateio.");
  } else {
    trabalhosPendentes.forEach(t => {
      const totalPendente = t.recebimentos.reduce((acc, r) => acc + r.valor, 0);
      console.log(`- Trabalho ID: ${t.id} ("${t.descricao}") => Valor Pendente: R$ ${totalPendente.toFixed(2)}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
