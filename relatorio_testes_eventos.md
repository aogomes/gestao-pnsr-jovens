# Relatório de Auditoria e Testes de Integração: Eventos, Inscrições e Pagamentos

Este relatório apresenta os resultados detalhados da execução dos testes de integração automatizados e da auditoria lógica realizada no fluxo de **Eventos, Inscrições e Pagamentos** do sistema paroquial. Nosso foco foi analisar a integridade do banco de dados (PostgreSQL/Prisma), avaliar riscos estruturais, fluxos financeiros e a possibilidade real de **transações órfãs**.

---

## 1. Mapeamento Físico de Dados e Fluxos

Durante o ciclo de vida de uma inscrição e seu respectivo pagamento via saldo, as seguintes tabelas e colunas do esquema relacional são modificadas ou criadas:

### Tabela de Mapeamento Físico de Dados

| Fluxo / Operação | Entidade / Tabela | Coluna Modificada | Tipo / Valor | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| **Criação do Evento** | `Evento` (`eventos`) | `status` | `StatusEvento` (`ATIVO`) | O evento é inicializado como ativo com as datas e valor configurados. |
| **Inscrição do Fiel** | `Inscricao` (`inscricoes`) | `status` | `StatusInscricao` (`PENDENTE`) | A inscrição vincula a pessoa ao evento de forma única (`@@unique([pessoaId, eventoId])`). |
| **Crédito Inicial** | `Transacao` (`transacoes`) | `tipo`, `origem`, `valor` | `'RECEITA'`, `'DEPOSITO'`, `Float` | Adiciona saldo financeiro ao fiel para permitir pagamentos. |
| **Débito de Inscrição** | `Transacao` (`transacoes`) | `tipo`, `pessoaId`, `valor` | `'DESPESA'`, `Int`, `Float` | Debita dinamicamente do saldo da pessoa o valor integral ou parcial da inscrição. |
| **Registro de Pagamento** | `PagamentoInscricao` (`pagamentos_inscricao`) | `valor`, `metodo`, `transacaoId` | `Float`, `'SALDO'`, `Int` | Cria o elo entre a inscrição e a transação financeira de débito. |

> [!NOTE]
> **Saldo do Fiel:** Similar ao comportamento dos vendedores nas rifas, o saldo acumulado de cada fiel (`Pessoa`) **não é armazenado em uma coluna física** na tabela `pessoas`. Ele é **calculado sob demanda em tempo real** realizando o somatório aritmético das transações financeiras vinculadas a ele (`RECEITA` soma, `DESPESA` subtrai).

---

## 2. Resultados Detalhados do Teste de Integração (`test-eventos-pagamentos.ts`)

O script de teste de integração foi executado com sucesso absoluto diretamente no ambiente NestJS local contra o banco de dados PostgreSQL. Abaixo estão os logs reais gerados pela execução:

```text
 === INICIALIZANDO CONTEXTO DO NESTJS PARA TESTES DE EVENTOS/INSCRIÇÕES/PAGAMENTOS === 

[Nest] 23704  - 21/05/2026, 09:08:26     LOG [NestFactory] Starting Nest application...
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] PrismaModule dependencies initialized +55ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] PassportModule dependencies initialized +0ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] JwtModule dependencies initialized +1ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] AppModule dependencies initialized +2ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] TrabalhosModule dependencies initialized +0ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] AutenticacaoModule dependencies initialized +1ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] ParoquiasModule dependencies initialized +0ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] EventosModule dependencies initialized +1ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] InscricoesModule dependencies initialized +0ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] UsuariosModule dependencies initialized +0ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] PessoasModule dependencies initialized +0ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] TransacoesModule dependencies initialized +0ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] ContasModule dependencies initialized +0ms
[Nest] 23704  - 21/05/2026, 09:08:26     LOG [InstanceLoader] RifasModule dependencies initialized +0ms
  ✔ Contexto NestJS e PrismaService carregados.

 === FASE 0: CORREÇÃO E ALINHAMENTO DE SEQUENCES POSTGRESQL === 

  ✔ Sequence da tabela "paroquias" resetada com sucesso.
  ✔ Sequence da tabela "pessoas" resetada com sucesso.
  ✔ Sequence da tabela "eventos" resetada com sucesso.
  ✔ Sequence da tabela "inscricoes" resetada com sucesso.
  ✔ Sequence da tabela "pagamentos_inscricao" resetada com sucesso.
  ✔ Sequence da tabela "transacoes" resetada com sucesso.

 === FASE 1: PREPARAÇÃO E LIMPEZA DE ESTADO DE TESTE === 

  ℹ Limpando dados de execuções de teste anteriores...
  ✔ Limpeza pré-teste concluída.
  ✔ Paróquia criada: [ID 2] GF PAROQUIA TESTE INTEGRACAO
  ✔ Pessoa (Fiel) criada: [ID 5] Fiel Teste Inscrição
  ✔ Crédito de R$ 150,00 adicionado à Pessoa. Transação ID: 1
  ✔ Saldo inicial do fiel: Esperado [150], obtido [150]
  ✔ Evento criado: [ID 1] GF EVENTO TESTE INTEGRACAO no valor de R$ 100

 === FASE 2: FLUXO DE INSCRIÇÃO E PAGAMENTO VIA SALDO === 

  ✔ Inscrição criada com sucesso: [ID 1]
  ✔ Status inicial da inscrição: Esperado [PENDENTE], obtido [PENDENTE]
  ℹ Validando rejeição de pagamentos com métodos diferentes de SALDO...
  ✔ Pagamento via PIX bloqueado com sucesso! Erro: "Os pagamentos de inscrição devem ser realizados exclusivamente via SALDO. Por favor, adicione crédito à pessoa primeiro."
  ℹ Validando rejeição de pagamentos que excedem o saldo disponível...
  ✔ Pagamento com saldo insuficiente bloqueado com sucesso! Erro: "Saldo insuficiente. Saldo atual: R$ 150.00"
  ℹ Realizando pagamento válido de R$ 100,00 via SALDO...
  ✔ Pagamento registrado com sucesso! Pagamento ID: 1
  ✔ Valor do pagamento registrado: Esperado [100], obtido [100]
  ✔ Saldo do fiel pós-pagamento de inscrição (Esperado: 150 - 100 = 50): Esperado [50], obtido [50]

 === FASE 3: AUDITORIA DE INTEGRIDADE E VULNERABILIDADES DE DADOS === 

  ℹ Verificando se o status da Inscrição foi atualizado automaticamente para CONFIRMADO após o pagamento...
  ⚠ Status da inscrição após o pagamento integral: [PENDENTE]
  ✔ FALHA LÓGICA CONFIRMADA: O pagamento foi debitado do saldo, mas a inscrição continua com status PENDENTE!
  ℹ Testando exclusão de Inscrição que possui pagamentos ativos...
  ✔ O banco de dados PostgreSQL bloqueou a exclusão devido à restrição de chave estrangeira (P2003)!
  ⚠ Análise: O banco está íntegro, mas isso causa um erro 500 não tratado na API e no frontend.
  ℹ Simulando processo de cancelamento/exclusão manual para demonstrar o risco de transação órfã...
  ✔ PagamentoInscricao removido manualmente.
  ✔ Inscricao removida manualmente.
  ⚠ Transação de Débito encontrada: [ID 2] "Pagamento Inscrição: GF EVENTO TESTE INTEGRACAO" de R$ 100
  ⚠ Esta transação possui contaId: [null] e pessoaId: [5]
  ✔ RISCO DE TRANSAÇÃO ÓRFÃ CONFIRMADO: A transação financeira permanece intacta no banco de dados!
  ℹ O fiel continua com o saldo desfalcado (R$ 50,00), mas não tem nenhuma inscrição nem registro de pagamento que comprove o destino do dinheiro.

 === FASE 4: TEAR DOWN (LIMPEZA COMPLETA DO BANCO) === 

  ℹ Iniciando limpeza de todos os registros gerados pelo teste de integração...
  ✔ Banco de dados restaurado e limpo com sucesso absoluto!
```

---

## 3. Avaliação de Riscos de Integridade e Falhas Lógicas

A auditoria estática do esquema do Prisma e a auditoria dinâmica via testes revelaram **quatro falhas lógicas e riscos arquiteturais críticos** no fluxo de eventos:

### Risco A: Transações Financeiras Órfãs (Vulnerabilidade Crítica de Negócio)
> [!CAUTION]
> **Definição da Falha:** A tabela `transacoes` **não tem nenhuma coluna relacional** que faça referência a `inscricoes` ou `eventos`. A ligação entre a despesa do fiel e o evento ocorre exclusivamente por meio do registro intermediário na tabela `pagamentos_inscricao` (que armazena `inscricaoId` e `transacaoId`).
> 
> **Mecanismo da Falha (Órfão Prático):**
> 1. Se uma inscrição for cancelada administrativamente e as linhas em `inscricoes` e `pagamentos_inscricao` forem deletadas do banco (conforme simulado no teste), a `Transacao` de débito financeiro **continua existindo** em `transacoes`.
> 2. O saldo do fiel permanece reduzido (deduzido permanentemente), mas **toda a rastreabilidade desaparece**: é impossível para um auditor paroquial saber a qual evento aquele dinheiro se referia ou se o fiel foi de fato inscrito.
> 3. Sem um vínculo relaci### Risco B: Acoplamento de Conceitos e Ausência do Campo `statusPagamento` em `Inscricao` (Grave Gap de Negócio)
> [!WARNING]
> **Definição da Falha:** O sistema atualmente confunde e acopla a **aprovação administrativa** da inscrição com a **confirmação financeira** (quitação do pagamento). Existe apenas o campo `status` em `Inscricao` (`PENDENTE`, `CONFIRMADO`, `AGUARDANDO_VAGA`), mas não há um campo específico para controlar o estado do pagamento (`statusPagamento`).
> 
> **Análise do Processo de Negócio:**
> 1. A confirmação administrativa de uma inscrição (aceitação pela paróquia para participar do evento) e a confirmação financeira (pagamento integral) são conceitos fundamentalmente distintos.
> 2. Primeiramente, a inscrição precisa ser **aceita pela administração** (recebendo aprovação para a vaga, ex: `StatusInscricao.CONFIRMADO`). Concorrentemente ou posteriormente, o fiel realiza pagamentos (que podem ser parcelados ao longo do tempo). A inscrição só estará financeiramente quitada ao final desses pagamentos.
> 3. Sem um campo `statusPagamento` dedicado em `inscricoes`, o sistema falha em expressar se uma inscrição aprovada pela paróquia está com os pagamentos pendentes, parcialmente quitados ou totalmente pagos.
> 
> **Impacto:** Há um gap de modelagem de dados. Tentar forçar o campo `status` administrativo a mudar automaticamente após o pagamento gera inconsistência de negócio (a administração perde o controle do aceite de vaga). Por outro lado, deixar tudo como `PENDENTE` administrativo oculta o estado real de adimplência financeira do participante.

### Risco C: Status `AGUARDANDO_VAGA` Sem Regras ou Lógica no Serviço (Código Morto)
> [!IMPORTANT]
> **Definição da Falha:** O enum `StatusInscricao` possui os valores `PENDENTE`, `CONFIRMADO` e `AGUARDANDO_VAGA` (lista de espera). No entanto:
> 1. A tabela `eventos` **não possui nenhum campo** de limite máximo de vagas (`vagasMaximas` ou similar).
> 2. O método `criar` inscrição do `InscricoesService` não possui nenhuma validação ou verificação de capacidade.
> 
> **Impacto:** O status `AGUARDANDO_VAGA` é impossível de ser atribuído automaticamente pelas regras do sistema. É um campo subutilizado ou puramente conceitual que pode gerar falsas expectativas no desenvolvimento do frontend.

### Risco D: Exclusões Abruptas com Erro 500 (Vulnerabilidade de UI/UX e API)
> [!WARNING]
> **Definição da Falha:** As relações estruturais no Prisma entre `Inscricao` -> `PagamentoInscricao` não possuem diretivas explícitas de exclusão. Quando o sistema chama `remover(id)` em `InscricoesService`, ele tenta rodar um `delete` direto no PostgreSQL.
> 
> **Impacto:** O PostgreSQL bloqueia corretamente a deleção por segurança referencial, mas a aplicação NestJS falha brutalmente com erro `P2003` (violação de chave estrangeira), resultando em status HTTP `500 Internal Server Error` indevidamente para a API e o frontend.

---

## 4. Recomendações e Plano de Aprimoramento Arquitetural

Para blindar os fluxos financeiros e assegurar a integridade total do banco de dados da paróquia, recomendamos a adoção imediata das seguintes melhorias de engenharia:

### Recomendação 1: Blindagem de Transações (Acoplamento Estrutural)
Modificar o modelo `Transacao` no `schema.prisma` para acomodar vínculos opcionais diretos com Inscrições e Eventos, protegendo o histórico financeiro:

```prisma
model Transacao {
  id                  Int                 @id @default(autoincrement())
  valor               Float
  tipo                TipoTransacao       // RECEITA, DESPESA, etc.
  origem              OrigemTransacao?    // PAGAMENTO, RIFA, etc.
  descricao           String
  
  // Vínculos estruturais diretos
  inscricaoId         Int?
  inscricao           Inscricao?          @relation(fields: [inscricaoId], references: [id], onDelete: SetNull)
  eventoId            Int?
  evento              Evento?             @relation(fields: [eventoId], references: [id], onDelete: Restrict)
  
  // Relações anteriores...
}
```

### Recomendação 2: Separação de Fluxo e Introdução do Campo `statusPagamento`
Recomendamos separar o fluxo administrativo de vagas do fluxo financeiro no modelo `Inscricao` no `schema.prisma` e no `InscricoesService`:

1. **Adicionar o Enum `StatusPagamentoInscricao` e o campo em `Inscricao`:**
```prisma
enum StatusPagamentoInscricao {
  PENDENTE
  PAGO_PARCIAL
  PAGO_INTEGRAL
}

model Inscricao {
  // ... campos existentes
  status           StatusInscricao          @default(PENDENTE) // Controle Administrativo (Aceito/Pendente/Fila)
  statusPagamento  StatusPagamentoInscricao @default(PENDENTE) // Controle Financeiro (Adimplência)
}
```

2. **Ajustar a Lógica do Serviço (`adicionarPagamento`):**
Ao registrar um pagamento via saldo, o método deve calcular o somatório histórico de todos os pagamentos já realizados para aquela inscrição:
* Se a soma dos pagamentos atingir ou superar o valor total do evento (`inscricao.evento.valor`), o status financeiro `statusPagamento` é atualizado para `PAGO_INTEGRAL`.
* Se a soma for menor, passa para `PAGO_PARCIAL`.
* O status administrativo `status` permanece inalterado, permitindo que a administração da paróquia controle de forma independente e soberana o aceite e a confirmação de participação do fiel no evento.

### Recomendação 3: Padrão Soft-Delete (Exclusão Lógica) para Inscrições
Substituir a exclusão física (`remover` com `prisma.inscricao.delete`) por um padrão de Soft-Delete (exclusão lógica).
* Adicionar a coluna `deletadoEm DateTime?` ou `ativo Boolean @default(true)` na tabela `Inscricao`.
* O cancelamento marcaria apenas o registro como inativo. Isso impede a ocorrência de quaisquer transações órfãs e preserva para sempre o histórico de auditoria do livro de caixa.

### Recomendação 4: Correção de Erros Amigáveis de Banco (Tratamento NestJS)
Adicionar filtros globais de exceção do Prisma no NestJS (como o `PrismaClientExceptionFilter`) ou adicionar tratamento try/catch explícito nos serviços antes de lançar chamadas de deleção física, convertendo erros de integridade `P2003` em `400 Bad Request` com mensagens descritivas para o usuário final.
