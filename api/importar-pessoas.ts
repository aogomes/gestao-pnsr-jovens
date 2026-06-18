import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import * as xlsx from 'xlsx';
import * as fs from 'fs';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const filePath = 'xxx';
  
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    await app.close();
    process.exit(1);
  }

  console.log(`Lendo arquivo: ${filePath}`);
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  
  // Usando raw: false para garantir que datas venham como strings formatadas (ex: 01/09/1983)
  const data: any[] = xlsx.utils.sheet_to_json(ws, { raw: false });

  console.log(`Encontradas ${data.length} linhas na aba '${sheetName}'.`);

  // Garante que a Paróquia "Nossa Senhora do Rosário" exista
  let paroquia = await prisma.paroquia.findFirst({
    where: { nome: { contains: 'Rosário', mode: 'insensitive' } }
  });

  if (!paroquia) {
    console.log('Paróquia "Paróquia Nossa Senhora do Rosário" não encontrada. Criando...');
    paroquia = await prisma.paroquia.create({
      data: {
        nome: 'Paróquia Nossa Senhora do Rosário',
        paroco: 'Desconhecido',
        cidade: 'Desconhecida'
      }
    });
  }
  
  console.log(`Usando Paróquia ID: ${paroquia.id} (${paroquia.nome})`);

  let inseridos = 0;
  let atualizados = 0;
  let erros = 0;

  for (const row of data) {
    try {
      const nomeCompleto = row['Nome Completo']?.trim();
      if (!nomeCompleto) {
        console.log(`Pulando linha sem nome: ${JSON.stringify(row)}`);
        continue;
      }

      const emailRaw = row['E-mail']?.trim();
      const email = emailRaw && emailRaw !== '—' && emailRaw.includes('@') ? emailRaw : null;
      
      const rgRaw = row['RG']?.trim();
      const rg = rgRaw !== '—' ? rgRaw : null;
      
      const nascimentoRaw = row['Nascimento']?.trim();
      let dataNascimento: Date | null = null;
      if (nascimentoRaw && nascimentoRaw !== '—') {
        const parts = nascimentoRaw.split('/');
        if (parts.length === 3) {
          dataNascimento = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }

      const passaporteRaw = row['Passaporte']?.trim();
      const passaporte = passaporteRaw !== '—' ? passaporteRaw : null;

      const emissaoValidadeRaw = row['Emissão/Validade']?.trim();
      const emissaoValidade = emissaoValidadeRaw !== '—' ? emissaoValidadeRaw : null;

      const telefoneRaw = row['Telefone']?.trim();
      const telefone = telefoneRaw !== '—' ? telefoneRaw : null;

      const perfilRaw = row['Perfil']?.trim();
      const perfis = perfilRaw && perfilRaw !== '—' ? [perfilRaw] : [];

      const comunidadeRaw = row['Comunidade']?.trim();
      const comunidade = comunidadeRaw !== '—' ? comunidadeRaw : null;

      const sexoRaw = row['Sexo']?.trim();
      const sexo = sexoRaw !== '—' ? sexoRaw : null;

      const orgaoEmissorRaw = row['Órgão Emissor']?.trim();
      const orgaoEmissor = orgaoEmissorRaw !== '—' ? orgaoEmissorRaw : null;

      const camisetaRaw = row['Camiseta']?.trim();
      const camiseta = camisetaRaw !== '—' ? camisetaRaw : null;

      const pessoaData = {
        nome: nomeCompleto,
        email,
        telefone,
        documento: rg, // Mapeando RG para documento genérico
        rg,
        dataNascimento,
        passaporte,
        passaporteEmissaoValidade: emissaoValidade,
        perfis,
        comunidade,
        sexo,
        orgaoEmissor,
        camiseta,
        paroquiaId: paroquia.id,
        ativo: true
      };

      // Tenta achar pessoa por e-mail ou nome
      let existingPessoa: any = null;
      
      if (email) {
        existingPessoa = await prisma.pessoa.findUnique({ where: { email } });
      }
      
      if (!existingPessoa && rg) {
         existingPessoa = await prisma.pessoa.findFirst({ where: { rg } });
      }

      if (!existingPessoa) {
        existingPessoa = await prisma.pessoa.findFirst({ where: { nome: nomeCompleto } });
      }

      if (existingPessoa) {
        await prisma.pessoa.update({
          where: { id: existingPessoa.id },
          data: pessoaData
        });
        atualizados++;
      } else {
        await prisma.pessoa.create({
          data: pessoaData
        });
        inseridos++;
      }

    } catch (err: any) {
      erros++;
      console.error(`Erro ao processar ${row['Nome Completo']}: ${err.message}`);
    }
  }

  console.log('--- Resumo da Importação ---');
  console.log(`Inseridos: ${inseridos}`);
  console.log(`Atualizados: ${atualizados}`);
  console.log(`Erros: ${erros}`);

  await app.close();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
