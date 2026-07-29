import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const jsonPath = path.join(__dirname, 'de_para_pessoas.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('Arquivo de_para_pessoas.json não encontrado!');
    process.exit(1);
  }

  const deParaList = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let mergeCount = 0;
  let ignoradosCount = 0;

  for (const item of deParaList) {
    if (item.acao === 'MERGE' && item.velhoId_sugerido) {
      console.log(`Fazendo MERGE de ${item.nomeNovo} (Novo ID: ${item.novoId}) -> para -> ${item.nomeVelho} (Velho ID: ${item.velhoId_sugerido})`);
      
      const pessoaNova = await prisma.pessoa.findUnique({ where: { id: item.novoId } });
      const pessoaVelha = await prisma.pessoa.findUnique({ where: { id: item.velhoId_sugerido } });

      if (!pessoaNova || !pessoaVelha) {
        console.error(`Falha: Registro não encontrado para novoId=${item.novoId} ou velhoId=${item.velhoId_sugerido}`);
        continue;
      }

      // 0. Liberar constraints únicas do novo registro antes do merge
      if (pessoaNova.email) {
        await prisma.pessoa.update({
          where: { id: pessoaNova.id },
          data: { email: null }
        });
      }

      // 1. Atualizar pessoa velha com dados ricos da pessoa nova
      await prisma.pessoa.update({
        where: { id: pessoaVelha.id },
        data: {
          nome: pessoaNova.nome, // Atualizar com o nome mais completo da planilha
          email: pessoaNova.email || pessoaVelha.email,
          documento: pessoaNova.documento || pessoaVelha.documento,
          telefone: pessoaNova.telefone || pessoaVelha.telefone,
          ativo: pessoaNova.ativo,
          paroquiaId: pessoaNova.paroquiaId || pessoaVelha.paroquiaId,
          dataNascimento: pessoaNova.dataNascimento || pessoaVelha.dataNascimento,
          sexo: pessoaNova.sexo || pessoaVelha.sexo,
          rg: pessoaNova.rg || pessoaVelha.rg,
          orgaoEmissor: pessoaNova.orgaoEmissor || pessoaVelha.orgaoEmissor,
          emailResponsavel: pessoaNova.emailResponsavel || pessoaVelha.emailResponsavel,
          emailResponsavel2: pessoaNova.emailResponsavel2 || pessoaVelha.emailResponsavel2,
          comunidade: pessoaNova.comunidade || pessoaVelha.comunidade,
          passaporte: pessoaNova.passaporte || pessoaVelha.passaporte,
          passaporteEmissaoValidade: pessoaNova.passaporteEmissaoValidade || pessoaVelha.passaporteEmissaoValidade,
          camiseta: pessoaNova.camiseta || pessoaVelha.camiseta,
          vaiComConjuge: pessoaNova.vaiComConjuge,
          nomeConjuge: pessoaNova.nomeConjuge || pessoaVelha.nomeConjuge,
          necessidadesMedicas: pessoaNova.necessidadesMedicas || pessoaVelha.necessidadesMedicas,
          responsavelLegal: pessoaNova.responsavelLegal || pessoaVelha.responsavelLegal,
          fotoPassaporte: pessoaNova.fotoPassaporte || pessoaVelha.fotoPassaporte,
          perfis: pessoaNova.perfis.length > 0 ? pessoaNova.perfis : pessoaVelha.perfis
        }
      });

      // 2. Apagar pessoa nova
      await prisma.pessoa.delete({
        where: { id: pessoaNova.id }
      });

      mergeCount++;
    } else {
      console.log(`Ignorando ${item.nomeNovo} (Ação: ${item.acao})`);
      ignoradosCount++;
    }
  }

  console.log(`\nFinalizado! Merges efetuados: ${mergeCount}. Mantidos como novos: ${ignoradosCount}.`);
  await app.close();
}

bootstrap().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
