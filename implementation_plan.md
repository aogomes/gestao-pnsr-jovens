# Plano de Implementação: Blindagem de Transações e Integridade Referencial

Este plano detalha a implementação das melhorias recomendadas nos relatórios de auditoria para fortalecer a integridade estrutural e financeira do ecossistema GF, eliminando acoplamentos fracos baseados em strings e adicionando chaves relacionais seguras.

---

## 🛠️ Alterações Propostas

O foco principal é o acoplamento estrutural da tabela `transacoes` com as entidades `Inscricao` e `Evento`, assegurando que o histórico de auditoria financeira esteja formalmente e fisicamente ligado às inscrições e eventos que deram origem a eles.

### 1. Modelo Físico (`api/prisma/schema.prisma`)

Adicionaremos chaves estrangeiras opcionais na tabela `transacoes` apontando para `inscricoes` e `eventos`:

- `inscricaoId` (Int, opcional) referenciando `Inscricao` com `onDelete: SetNull`. Isso garante que se uma inscrição for deletada ou limpa, a transação financeira de auditoria não seja perdida, apenas desvinculada fisicamente.
- `eventoId` (Int, opcional) referenciando `Evento` com `onDelete: Restrict`. Isso impede a exclusão acidental de um evento que possua movimentações de caixa vinculadas, blindando a integridade do livro de caixa.

#### [MODIFY] [schema.prisma](file:///c:/Projetos/GF/api/prisma/schema.prisma)
```prisma
model Transacao {
  id           Int           @id @default(autoincrement())
  valor        Float
  tipo         TipoTransacao
  origem       OrigemTransacao?
  descricao    String
  metodo       String?       // PIX, Dinheiro, Cartão, etc.
  data         DateTime      @default(now())
  pessoaId     Int?
  pessoa       Pessoa?       @relation(fields: [pessoaId], references: [id])
  contaId      Int?
  conta        Conta?        @relation(fields: [contaId], references: [id])
  pagamentosInscricao PagamentoInscricao[]
  recebimentoTrabalhoId Int?
  recebimentoTrabalho   RecebimentoTrabalho? @relation(fields: [recebimentoTrabalhoId], references: [id], onDelete: Cascade)
  loteRateioId Int?
  loteRateio   LoteRateio?   @relation(fields: [loteRateioId], references: [id], onDelete: Cascade)
  rifaId       Int?
  rifa         Rifa?         @relation(fields: [rifaId], references: [id], onDelete: SetNull)
  
  // Novos Vínculos Relacionais de Integridade
  inscricaoId  Int?
  inscricao    Inscricao?    @relation(fields: [inscricaoId], references: [id], onDelete: SetNull)
  eventoId     Int?
  evento       Evento?       @relation(fields: [eventoId], references: [id], onDelete: Restrict)

  criadoEm     DateTime      @default(now())
  atualizadoEm DateTime      @updatedAt

  @@map("transacoes")
}

model Evento {
  // ... campos existentes ...
  inscricoes       Inscricao[]
  transacoes       Transacao[] // Nova relação reversa para Transacao
  criadoEm         DateTime      @default(now())
  atualizadoEm     DateTime      @updatedAt

  @@map("eventos")
}

model Inscricao {
  // ... campos existentes ...
  pagamentos   PagamentoInscricao[]
  transacoes   Transacao[] // Nova relação reversa para Transacao
  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  @@unique([pessoaId, eventoId])
  @@map("inscricoes")
}
```

---

### 2. Lógica do Serviço de Inscrições (`api/src/inscricoes/inscricoes.service.ts`)

Atualizaremos as rotinas de criação de transações financeiras para preencher fisicamente as colunas de relacionamento `inscricaoId` e `eventoId`.

#### [MODIFY] [inscricoes.service.ts](file:///c:/Projetos/GF/api/src/inscricoes/inscricoes.service.ts)

- **Método `atualizarStatus` (fluxo de estorno ao rejeitar):**
  Ao gerar o estorno financeiro de receita, vincular o ID da inscrição e o ID do evento correspondente:
  ```typescript
  await tx.transacao.create({
    data: {
      valor: pagamento.valor,
      tipo: 'RECEITA',
      descricao: `Estorno Pagamento Inscrição: ${inscricao.evento.nome}`,
      pessoaId: inscricao.pessoaId,
      inscricaoId: id, // Link com a Inscrição
      eventoId: inscricao.eventoId, // Link com o Evento
      data: new Date()
    }
  });
  ```

- **Método `adicionarPagamento` (fluxo de débito via saldo):**
  Ao gerar a transação de despesa (débito) para o pagamento, vincular os IDs:
  ```typescript
  const transacao = await tx.transacao.create({
    data: {
      valor: createPagamentoDto.valor,
      tipo: 'DESPESA',
      descricao: `Pagamento Inscrição: ${inscricao.evento.nome}`,
      pessoaId: inscricao.pessoaId,
      inscricaoId: inscricao.id, // Link com a Inscrição
      eventoId: inscricao.eventoId, // Link com o Evento
      data: new Date()
    }
  });
  ```

---

## 📈 Plano de Verificação e Testes

### 1. Migração do Banco de Dados
Executaremos os comandos locais para criar e aplicar a nova migração do Prisma com segurança:
```powershell
npx prisma migrate dev --name add_transacao_relations
```

### 2. Suíte de Testes de Integração
Rodaremos os três scripts de teste de integração para assegurar regressão zero em todo o ecossistema GF:
1. `npx ts-node test-eventos-pagamentos.ts` (Validará o fluxo de inscrições/pagamentos com os novos vínculos)
2. `npx ts-node test-rifa-rateio.ts` (Validará rifas)
3. `npx ts-node test-trabalhos-rateio.ts` (Validará trabalhos)

---

## 💬 Aguardando sua Aprovação

Por favor, revise o plano de implementação. Uma vez aprovado, procederei com a atualização do `schema.prisma`, geração da migration de banco e atualização da service, seguidos da verificação completa.
