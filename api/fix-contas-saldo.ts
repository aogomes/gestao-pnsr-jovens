import { PrismaClient, TipoTransacao } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contas = await prisma.conta.findMany({
    include: { transacoes: true }
  });

  for (const conta of contas) {
    if (conta.saldo > 0 && conta.transacoes.length === 0) {
      console.log(`Criando transação de saldo inicial para conta: ${conta.nome} com saldo: ${conta.saldo}`);
      await prisma.transacao.create({
        data: {
          valor: conta.saldo,
          tipo: TipoTransacao.RECEITA,
          descricao: 'Saldo Inicial da Conta',
          contaId: conta.id,
          data: conta.criadoEm
        }
      });
    }
  }

  console.log('Finalizado.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
