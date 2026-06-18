import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  // A data em que o script anterior rodou (ajustar a hora para ter uma margem)
  const cutOffDate = new Date('2026-06-17T15:00:00.000Z');

  // Pega todas as pessoas criadas hoje (depois das 15h)
  const novasPessoas = await prisma.pessoa.findMany({
    where: { criadoEm: { gt: cutOffDate } }
  });

  // Pega todas as pessoas antigas (antes de hoje às 15h)
  const pessoasAntigas = await prisma.pessoa.findMany({
    where: { criadoEm: { lte: cutOffDate } }
  });

  const deParaList: any[] = [];

  for (const nova of novasPessoas) {
    const nomeNovoLimpo = removeAccents(nova.nome);
    const partesNomeNovo = nomeNovoLimpo.split(' ').filter(p => p.length > 2);
    
    let bestMatch: any = null;
    let maxScore = 0;

    for (const antiga of pessoasAntigas) {
      const nomeAntigoLimpo = removeAccents(antiga.nome);
      const partesNomeAntigo = nomeAntigoLimpo.split(' ').filter(p => p.length > 2);

      let score = 0;
      
      // Match exato
      if (nomeNovoLimpo === nomeAntigoLimpo) {
        score = 100;
      } else {
        // Quantas partes do nome antigo estão presentes no nome novo?
        let matches = 0;
        for (const p of partesNomeAntigo) {
          if (partesNomeNovo.includes(p)) {
            matches++;
          }
        }
        
        // Exemplo: "Alessandro Gomes" tem 2 partes. Se achar as 2 em "Alessandro Oliveira Gomes", o score será alto.
        if (partesNomeAntigo.length > 0) {
          score = (matches / partesNomeAntigo.length) * 50; 
        }
        
        // Verifica primeiro nome e último nome em comum para dar um bonus
        if (partesNomeNovo[0] === partesNomeAntigo[0] && 
            partesNomeNovo[partesNomeNovo.length -1] === partesNomeAntigo[partesNomeAntigo.length - 1] &&
            partesNomeAntigo.length > 1) {
            score += 40;
        }
      }

      // Desempate por e-mail ou telefone, caso existissem no registro antigo
      if (antiga.email && nova.email && antiga.email.toLowerCase() === nova.email.toLowerCase()) {
         score += 100;
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = antiga;
      }
    }

    // Se o score for muito baixo, consideramos que não achou (ou precisa de revisão cuidadosa)
    // Mas vamos colocar a melhor sugestão de qualquer forma, ou null se não houver NADA
    let acao = 'MERGE';
    if (maxScore < 20) {
      acao = 'MANTER_NOVO';
      bestMatch = null;
    }

    deParaList.push({
      novoId: nova.id,
      nomeNovo: nova.nome,
      acao: acao,
      velhoId_sugerido: bestMatch ? bestMatch.id : null,
      nomeVelho: bestMatch ? bestMatch.nome : null,
      confianca_score: Math.round(maxScore)
    });
  }

  const outputPath = path.join(__dirname, 'de_para_pessoas.json');
  fs.writeFileSync(outputPath, JSON.stringify(deParaList, null, 2));
  
  console.log(`Gerado arquivo em: ${outputPath}`);
  console.log(`Pessoas novas avaliadas: ${novasPessoas.length}`);
  
  await app.close();
}

bootstrap().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
