import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const url = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrate() {
  console.log('🚀 Iniciando script de migração inteligente para centralização em Eventos...');

  try {
    // 1. Garantir que temos pelo menos uma paróquia e uma conta para placeholders
    let paroquia = await prisma.paroquia.findFirst();
    if (!paroquia) {
      console.log('⚠️ Nenhuma paróquia encontrada. Criando paróquia padrão...');
      paroquia = await prisma.paroquia.create({
        data: {
          nome: 'Paróquia Central de Testes',
          paroco: 'Padre Padrão',
          cidade: 'Cidade Exemplo'
        }
      });
    }

    let conta = await prisma.conta.findFirst();
    if (!conta) {
      console.log('⚠️ Nenhuma conta bancária encontrada. Criando conta padrão...');
      conta = await prisma.conta.create({
        data: {
          nome: 'Caixa Geral Padrão',
          saldo: 0,
          paroquiaId: paroquia.id
        }
      });
    }

    // Função auxiliar para obter ou criar evento placeholder para um contaId
    async function obterOuCriarEventoParaConta(contaId: number, prefix: string): Promise<number> {
      // Procurar se já existe um evento usando essa conta
      const eventoExistente = await prisma.evento.findFirst({
        where: { contaId }
      });
      if (eventoExistente) {
        return eventoExistente.id;
      }

      // Se não existe, buscar paróquia da conta
      const contaDb = await prisma.conta.findUnique({
        where: { id: contaId },
        include: { paroquia: true }
      });
      const pId = contaDb?.paroquiaId || paroquia!.id;

      // Criar o evento placeholder
      const novoEvento = await prisma.evento.create({
        data: {
          nome: `Evento Migrado (${prefix} - Conta: ${contaDb?.nome || contaId})`,
          paroquiaId: pId,
          contaId: contaId,
          dataInicio: new Date(),
          dataFim: new Date(),
          valor: 0,
          limiteInscricao: new Date(),
          status: 'ATIVO'
        }
      });
      console.log(`✨ Criado Evento Placeholder para a Conta #${contaId}: "${novoEvento.nome}" (ID: ${novoEvento.id})`);
      return novoEvento.id;
    }

    // 2. Migrar Rifas
    console.log('\n📊 Migrando Rifas...');
    const rifas = await prisma.rifa.findMany({ include: { conta: true } });
    for (const r of rifas) {
      if (r.eventoId) {
        console.log(`⏩ Rifa #${r.id} "${r.nome}" já possui eventoId.`);
        continue;
      }

      const cId = r.contaId || conta!.id;
      const evId = await obterOuCriarEventoParaConta(cId, 'Rifa');

      await prisma.rifa.update({
        where: { id: r.id },
        data: { eventoId: evId }
      });
      console.log(`✅ Rifa #${r.id} "${r.nome}" vinculada ao Evento #${evId}`);
    }

    // 3. Migrar Trabalhos
    console.log('\n💼 Migrando Trabalhos...');
    const trabalhos = await prisma.trabalho.findMany({ include: { conta: true } });
    for (const t of trabalhos) {
      if (t.eventoId) {
        console.log(`⏩ Trabalho #${t.id} "${t.descricao}" já possui eventoId.`);
        continue;
      }

      const cId = t.contaId || conta!.id;
      const evId = await obterOuCriarEventoParaConta(cId, 'Trabalho');

      await prisma.trabalho.update({
        where: { id: t.id },
        data: { eventoId: evId }
      });
      console.log(`✅ Trabalho #${t.id} "${t.descricao}" vinculado ao Evento #${evId}`);
    }

    // 4. Inscrições Retroativas para Alocações de Rifa
    console.log('\n🎟️ Gerando inscrições retroativas para alocações de Rifas...');
    const alocacoes = await prisma.alocacaoRifa.findMany({
      include: { rifa: true }
    });

    for (const aloc of alocacoes) {
      const evId = aloc.rifa.eventoId;
      if (!evId) continue;

      // Verificar se a inscrição já existe
      const inscExistente = await prisma.inscricao.findUnique({
        where: {
          pessoaId_eventoId: {
            pessoaId: aloc.pessoaId,
            eventoId: evId
          }
        }
      });

      if (!inscExistente) {
        await prisma.inscricao.create({
          data: {
            pessoaId: aloc.pessoaId,
            eventoId: evId,
            status: 'CONFIRMADO'
          }
        });
        console.log(`👤 Inscrito retroativamente: Pessoa #${aloc.pessoaId} no Evento #${evId} (por alocação de rifa)`);
      }
    }

    // 5. Inscrições Retroativas para Membros/Trabalhadores de Trabalhos
    console.log('\n👷 Gerando inscrições retroativas para trabalhadores...');
    const membrosTrabalho = await prisma.membroTrabalho.findMany({
      include: { trabalho: true }
    });

    for (const m of membrosTrabalho) {
      const evId = m.trabalho.eventoId;
      if (!evId) continue;

      const inscExistente = await prisma.inscricao.findUnique({
        where: {
          pessoaId_eventoId: {
            pessoaId: m.pessoaId,
            eventoId: evId
          }
        }
      });

      if (!inscExistente) {
        await prisma.inscricao.create({
          data: {
            pessoaId: m.pessoaId,
            eventoId: evId,
            status: 'CONFIRMADO'
          }
        });
        console.log(`👤 Inscrito retroativamente: Pessoa #${m.pessoaId} no Evento #${evId} (por membro de trabalho em grupo)`);
      }
    }

    // Trabalhadores de trabalhos individuais
    const trabalhosIndiv = await prisma.trabalho.findMany({
      where: { tipo: 'INDIVIDUAL', pessoaId: { not: null } }
    });

    for (const t of trabalhosIndiv) {
      const evId = t.eventoId;
      const pId = t.pessoaId;
      if (!evId || !pId) continue;

      const inscExistente = await prisma.inscricao.findUnique({
        where: {
          pessoaId_eventoId: {
            pessoaId: pId,
            eventoId: evId
          }
        }
      });

      if (!inscExistente) {
        await prisma.inscricao.create({
          data: {
            pessoaId: pId,
            eventoId: evId,
            status: 'CONFIRMADO'
          }
        });
        console.log(`👤 Inscrito retroativamente: Pessoa #${pId} no Evento #${evId} (por trabalhador individual)`);
      }
    }

    // 6. Migrar Saques
    console.log('\n💵 Migrando Saques legados...');
    const saques = await prisma.saque.findMany({
      include: { pessoa: { include: { inscricoes: true } } }
    });

    for (const s of saques) {
      if (s.eventoId) {
        console.log(`⏩ Saque #${s.id} já possui eventoId.`);
        continue;
      }

      // Procurar algum evento que a pessoa está inscrita
      let evId: number | null = null;
      if (s.pessoa.inscricoes.length > 0) {
        evId = s.pessoa.inscricoes[0].eventoId;
      } else {
        // Se a pessoa não tiver inscrição, buscar qualquer evento no sistema
        const primeiroEvento = await prisma.evento.findFirst();
        if (primeiroEvento) {
          evId = primeiroEvento.id;
          // Inscrever a pessoa no evento para manter consistência
          await prisma.inscricao.create({
            data: {
              pessoaId: s.pessoaId,
              eventoId: evId,
              status: 'CONFIRMADO'
            }
          });
          console.log(`👤 Inscrito retroativamente para Saque: Pessoa #${s.pessoaId} no Evento #${evId}`);
        }
      }

      if (!evId) {
        // Fallback absoluto: criar um evento genérico
        const novoEvento = await prisma.evento.create({
          data: {
            nome: 'Evento Consolidado Geral',
            paroquiaId: paroquia!.id,
            contaId: conta!.id,
            dataInicio: new Date(),
            dataFim: new Date(),
            valor: 0,
            limiteInscricao: new Date(),
            status: 'ATIVO'
          }
        });
        evId = novoEvento.id;
        await prisma.inscricao.create({
          data: {
            pessoaId: s.pessoaId,
            eventoId: evId,
            status: 'CONFIRMADO'
          }
        });
      }

      await prisma.saque.update({
        where: { id: s.id },
        data: { eventoId: evId }
      });
      console.log(`✅ Saque #${s.id} de R$ ${s.valor} vinculado ao Evento #${evId}`);
    }

    // 7. Migrar Transações legadas (Comissões e Repasses)
    console.log('\n💸 Vinculando Transações financeiras existentes aos Eventos...');
    const transacoes = await prisma.transacao.findMany({
      include: { rifa: true, loteRateio: { include: { trabalho: true } }, inscricao: true }
    });

    let transacoesAtualizadas = 0;
    for (const t of transacoes) {
      if (t.eventoId) continue;

      let evId: number | null = null;
      if (t.rifa && t.rifa.eventoId) {
        evId = t.rifa.eventoId;
      } else if (t.loteRateio?.trabalho && t.loteRateio.trabalho.eventoId) {
        evId = t.loteRateio.trabalho.eventoId;
      } else if (t.inscricao && t.inscricao.eventoId) {
        evId = t.inscricao.eventoId;
      }

      if (evId) {
        await prisma.transacao.update({
          where: { id: t.id },
          data: { eventoId: evId }
        });
        transacoesAtualizadas++;
      }
    }
    console.log(`✅ Foram vinculadas ${transacoesAtualizadas} transações financeiras aos seus respectivos eventos.`);

    console.log('\n🎉 SCRIPT DE MIGRAÇÃO INTELIGENTE CONCLUÍDO COM SUCESSO! 🎉');

  } catch (err) {
    console.error('❌ Erro durante a execução da migração:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

migrate();
