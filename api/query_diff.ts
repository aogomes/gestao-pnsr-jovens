import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  // Get all works
  const trabalhos = await prisma.trabalho.findMany({
    include: {
      recebimentos: { where: { status: 'PAGO' } },
      despesas: true,
      membros: { include: { pessoa: true } },
      pessoa: true,
    }
  });

  // Get all transactions
  const transacoes = await prisma.transacao.findMany({
    where: { 
      tipo: 'RECEITA', 
      origem: 'TRABALHO',
      pessoaId: { not: null }
    }
  });

  const somaPorPessoaTransacoes: Record<number, number> = {};
  for (const t of transacoes) {
    if (t.pessoaId) {
      somaPorPessoaTransacoes[t.pessoaId] = (somaPorPessoaTransacoes[t.pessoaId] || 0) + t.valor;
    }
  }

  const somaPorPessoaTrabalhos: Record<number, number> = {};
  for (const t of trabalhos) {
    const totalPago = t.recebimentos.reduce((acc, r) => acc + r.valor, 0);
    const totalDesp = t.despesas.reduce((acc, d) => acc + d.valor, 0);
    
    if (t.tipo === 'INDIVIDUAL') {
      const recsPessoais: Record<number, number> = {};
      for (const r of t.recebimentos) {
        const pid = r.pessoaId || t.pessoaId;
        if (pid) {
          recsPessoais[pid] = (recsPessoais[pid] || 0) + r.valor;
        }
      }
      for (const [pidStr, valor] of Object.entries(recsPessoais)) {
        const pid = Number(pidStr);
        const repasse = valor * (t.proporcao / 100);
        somaPorPessoaTrabalhos[pid] = (somaPorPessoaTrabalhos[pid] || 0) + repasse;
      }
    } else {
      const valorLiquido = Math.max(0, totalPago - totalDesp);
      if (t.membros.length > 0) {
        const cota = valorLiquido / t.membros.length;
        for (const m of t.membros) {
          somaPorPessoaTrabalhos[m.pessoaId] = (somaPorPessoaTrabalhos[m.pessoaId] || 0) + cota;
        }
      }
    }
  }

  console.log("=== DIFERENÇAS ===");
  const todasPessoas = new Set([...Object.keys(somaPorPessoaTransacoes), ...Object.keys(somaPorPessoaTrabalhos)]);
  
  for (const pidStr of todasPessoas) {
    const pid = Number(pidStr);
    const trans = somaPorPessoaTransacoes[pid] || 0;
    const trab = somaPorPessoaTrabalhos[pid] || 0;
    
    if (Math.abs(trans - trab) > 0.01) {
      const p = await prisma.pessoa.findUnique({ where: { id: pid }});
      console.log(`Pessoa ID ${pid} (${p?.nome}): Trabalhos diz ${trab.toFixed(2)}, Transacoes (Pessoas) diz ${trans.toFixed(2)}. Diferença: ${(trab - trans).toFixed(2)}`);
    }
  }

  await app.close();
}

bootstrap();
