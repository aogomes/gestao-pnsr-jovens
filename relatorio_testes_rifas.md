# Relatório de Auditoria e Testes de Integração: Rifas, Alocações e Rateios

Este relatório detalha os resultados da **Skill de Teste de Integração** executada diretamente no contexto do NestJS/Prisma, validando a funcionalidade de campanhas de rifas, alocações de vendedores, vendas de bilhetes e os mecanismos de rateio integral e proporcional. Adicionalmente, apresenta-se uma análise profunda sobre a integridade do modelo relacional e os riscos de registros órfãos.

---

## 1. Mapeamento de Destino dos Lançamentos e Tabelas

Durante a execução da campanha e do processo de rateio consolidado, os lançamentos financeiros e estados de entidades são persistidos nas seguintes tabelas e colunas:

### Mapeamento Físico de Dados

| Operação / Fluxo | Entidade / Tabela | Coluna Modificada | Tipo / Valor | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| **Criação da Rifa** | `Rifa` (`rifas`) | `status` | `StatusRifa` (`ATIVA`) | A campanha é iniciada no estado ativa. |
| **Alocação de Números** | `AlocacaoRifa` (`alocacoes_rifa`) | `inicioRange`, `fimRange`, `ativa` | `Int`, `Int`, `Boolean` | Registra a faixa de bilhetes alocados para um vendedor específico. |
| **Alocação de Vendedor** | `Bilhete` (`bilhetes`) | `vendedorId` | `Int` (FK para `Pessoa`) | Vincula a faixa de números ao vendedor correspondente na campanha. |
| **Venda Individual** | `Bilhete` (`bilhetes`) | `status`, `comprovante`, `dataVenda` | `'VENDIDO'`, `String`, `DateTime` | Marca o bilhete individual como vendido e anexa a string/URL do comprovante. |
| **Rateio de Conta (Paróquia)** | `Conta` (`contas`) | `saldo` | `Float` (Incremento) | O saldo físico da conta bancária da paróquia é incrementado pelo valor proporcional (`valorParaConta`). |
| **Ledger da Conta** | `Transacao` (`transacoes`) | `valor`, `tipo`, `contaId`, `pessoaId` | `Float`, `'RECEITA'`, `Int`, `null` | Cria uma transação de receita vinculada à conta paroquial, com `pessoaId` como nulo. |
| **Ledger do Vendedor** | `Transacao` (`transacoes`) | `valor`, `tipo`, `contaId`, `pessoaId` | `Float`, `'RECEITA'`, `null`, `Int` | Cria uma transação de comissão vinculada à pessoa do vendedor, com `contaId` como nulo. |
| **Finalização** | `Rifa` (`rifas`) | `status` | `'FINALIZADA'` | O status da campanha é alterado para finalizada, impedindo novos rateios. |

> [!NOTE]
> **Saldo do Vendedor:** Conforme auditado em `pessoas.service.ts`, o saldo acumulado de comissões de cada vendedor (`Pessoa`) **não é uma coluna no banco de dados**. Ele é **calculado dinamicamente em tempo real** através de um somatório das transações financeiras vinculadas a ele (`t.tipo === 'RECEITA' ? +t.valor : -t.valor`).

---

## 2. Resultados Detalhados da Skill de Teste (`test-rifa-rateio.ts`)

A Skill executou quatro fases automatizadas em nosso banco de dados PostgreSQL local, utilizando o contexto real de injeção de dependências do NestJS:

```
 === INICIALIZANDO CONTEXTO DO NESTJS PARA TESTES === 
  ✔ Contexto NestJS e PrismaService carregados.

 === FASE 0: CORREÇÃO E ALINHAMENTO DE SEQUENCES POSTGRESQL === 
  ✔ Sequence da tabela "paroquias" resetada com sucesso.
  ✔ Sequence da tabela "contas" resetada com sucesso.
  ...
```

### Cenário 1: Rateio Integral (100% para Vendedores)
* **Configuração:** Rifa criada com `valorNumero = R$ 10,00` e `percentualRateio = 100%`.
* **Fluxo:** Alocados 10 bilhetes para `Vendedor 1`. Simuladas **5 vendas** (`arrecadação bruta = R$ 50,00`).
* **Execução do Rateio:**
  * **Valor Destinado à Paróquia (0%):** `R$ 0,00`
  * **Valor Destinado ao Vendedor (100%):** `R$ 50,00`
* **Asserções Validadas com Sucesso (100% Pass):**
  * Status da Rifa passou para `FINALIZADA` (Esperado: `FINALIZADA`, Obtido: `FINALIZADA`).
  * Saldo da Conta Bancária da Paróquia permaneceu exatamente `R$ 0,00`.
  * Foi gerada **1 transação** de comissão para o Vendedor 1 no valor exato de `R$ 50,00`.
  * O saldo dinâmico do Vendedor 1 recalculado via transações resultou em `R$ 50,00`.

### Cenário 2: Rateio Proporcional (30% Vendedor / 70% Paróquia)
* **Configuração:** Rifa criada com `valorNumero = R$ 20,00` e `percentualRateio = 30%`.
* **Fluxo:** Alocados 10 bilhetes para `Vendedor 2` (faixa 1 a 10 scoped na Rifa 2). Simuladas **8 vendas** (`arrecadação bruta = R$ 160,00`).
* **Cálculo de Rateio:**
  * **Paróquia (70%):** `R$ 160,00 * 0.70 = R$ 112,00`
  * **Vendedor (30%):** `R$ 160,00 * 0.30 = R$ 48,00`
* **Asserções Validadas com Sucesso (100% Pass):**
  * Status da Rifa Proporcional passou para `FINALIZADA`.
  * O saldo real da `Conta` bancária paroquial incrementou e fechou em exatamente `R$ 112,00`.
  * Foram encontradas **2 transações** na conta (1 da Rifa 1 no valor de 0, e 1 da Rifa 2 no valor de `R$ 112,00`).
  * A transação do Vendedor 2 foi criada como `RECEITA` no valor exato de `R$ 48,00`.
  * O saldo dinâmico acumulado do Vendedor 2 recalculado fechou em exatamente `R$ 48,00`.

---

## 3. Avaliação de Riscos: Registros Órfãos e Inconsistências

Durante a auditoria estática do esquema do Prisma e a fase de auditoria prática (Fase 3 do script de teste), identificamos **três vulnerabilidades arquiteturais críticas** que podem dar origem a registros órfãos ou inconsistências financeiras:

### Risco A: Acoplamento Fraco e Ausência da FK `rifaId` em `Transacao`
> [!WARNING]
> **Vulnerabilidade:** A tabela `transacoes` no banco de dados **não possui uma coluna** `rifaId`. As transações geradas por um rateio de rifa possuem apenas uma descrição em texto comum (ex: `"Comissão de Vendas (8 bilhetes) - Rifa: Rifa Teste Proporcional (30%)"`).
>
> **Risco de Órfãos:** 
> 1. Caso uma `Rifa` seja excluída por meio de acessos diretos no banco de dados ou bypass de rotinas de serviço, todas as transações financeiras geradas por ela permanecerão ativas no ledger de transações, tornando-se **órfãs estruturais** sem nenhum vínculo relacional que as identifique.
> 2. Impossibilidade de realizar queries eficientes e seguras como `prisma.transacao.findMany({ where: { rifaId } })` ou deletes em cascata automáticos integrados no banco.

### Risco B: Bloqueio de Deleção de Vendedores (`Pessoa`)
> [!IMPORTANT]
> **Vulnerabilidade:** A relação entre `AlocacaoRifa` (ou `Bilhete`) e `Pessoa` não possui diretrizes como `onDelete: Cascade` ou `onDelete: SetNull`.
>
> **Comportamento Observado no Teste:** Quando o script tentou deletar o `Vendedor 1` (que possuía bilhetes vendidos e alocações registradas), o banco de dados PostgreSQL bloqueou a operação com sucesso e lançou um erro de violação de restrição de chave estrangeira (`Foreign Key Constraint Violation` - código Prisma `P2003`).
>
> **Análise:** O banco de dados está agindo de forma segura para evitar que registros em `AlocacaoRifa` percam seu vendedor e fiquem sem dono (evitando órfãos imediatos). Entretanto, do ponto de vista do software, se o sistema administrativo tentar deletar uma `Pessoa` sem antes inativar ou desalocar seus recursos de rifa, o usuário enfrentará **erros inesperados de banco** que travam a aplicação.

### Risco C: Ausência de Lançamentos em Tempo Real na Venda Individual
> [!CAUTION]
> **Vulnerabilidade:** No fluxo atual do sistema, as vendas de bilhetes alteram propriedades em `Bilhete` e salvam o comprovante, mas **não registram nenhuma transação** na tabela `transacoes`. O fluxo financeiro só é contabilizado no rateio final.
>
> **Análise de Inconsistência:**
> 1. **Falta de Conciliação:** Se um vendedor coletar valores de bilhetes via dinheiro ou Pix no dia a dia, essas entradas de caixa não aparecem no livro de transações. O fluxo financeiro é invisível até o administrador decidir finalizar a campanha e rodar o rateio em lote.
> 2. **Risco de Perda de Rastreamento:** Se a campanha for cancelada ou resetada antes do rateio, não haverá nenhum registro histórico do dinheiro que circulou individualmente através dos bilhetes vendidos, resultando em brechas na auditoria fiscal paroquial.

---

## 4. Recomendações de Aprimoramento da Arquitetura

Para blindar o sistema paroquial contra essas vulnerabilidades e elevar a confiabilidade dos relatórios financeiros, recomendamos a implementação dos seguintes ajustes no esquema e lógica do sistema:

### Recomendação 1: Adicionar Vínculo Relacional Direto na Transação
Modificar o modelo `Transacao` no `schema.prisma` para incluir uma relação direta (opcional) com a `Rifa`. Isso resolveria o acoplamento fraco e permitiria deleções em cascata seguras:

```prisma
model Transacao {
  id           Int              @id @default(autoincrement())
  valor        Float
  tipo         TipoTransacao
  origem       OrigemTransacao?
  descricao    String
  
  // Nova relação direta com Rifa
  rifaId       Int?
  rifa         Rifa?            @relation(fields: [rifaId], references: [id], onDelete: SetNull)
  
  // Relações existentes...
  pessoaId     Int?
  pessoa       Pessoa?          @relation(fields: [pessoaId], references: [id])
  contaId      Int?
  conta        Conta?           @relation(fields: [contaId], references: [id])
}
```

### Recomendação 2: Estratégia de Arquivamento / Inativação Lógica para Pessoas
Em vez de deletar fisicamente registros de `Pessoa` (que possuem rastros históricos de vendas de bilhetes, trabalhos e transações financeiras), deve-se adotar o padrão de **Soft-Delete** (Exclusão Lógica).
* Adicionar um campo `ativo Boolean @default(true)` ou `deletadoEm DateTime?` na tabela `Pessoa`.
* Ajustar os métodos `buscarTodas` nas services para filtrar apenas registros ativos. Isso preserva a integridade referencial histórica do ledger financeiro sem quebrar as restrições do PostgreSQL.

### Recomendação 3: Ledgerização em Tempo Real das Vendas
Sempre que um bilhete for vendido (`atualizarBilhete` para `status: VENDIDO`), o sistema deve registrar uma transação financeira individual do tipo `RECEITA` (origem `RIFA`) no valor do bilhete, associando-a ao vendedor.
* No rateio final, o sistema apenas consolidará e transferirá os percentuais correspondentes, ou simplesmente fará o fechamento da campanha. Isso garante transparência de caixa diária e relatórios de fluxo de caixa em tempo real para os gestores da paróquia.
