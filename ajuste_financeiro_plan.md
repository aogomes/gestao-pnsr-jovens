# Plano de Implementação: Ajuste de Fluxo de Inscrições e Regras Financeiras

Este plano detalha as alterações necessárias no backend e no frontend do projeto GF para reestruturar o ciclo de vida das inscrições em eventos, adicionando validações de pagamento e lógica de estorno automático.

---

## Entendimento das Regras de Negócio

1. **Substituição de Status Obsoleto (`AGUARDANDO_VAGA`):**
   - O status `AGUARDANDO_VAGA` é considerado código morto e será removido.
   - Os novos status administrativos disponíveis serão:
     - `PENDENTE`: Status inicial automático ao se inscrever.
     - `CONFIRMADO`: Aprovado pelo administrador.
     - `REJEITADA`: Recusado pelo administrador.
     - `EM_ANALISE`: Suspenso temporariamente por inconsistências para análise futura.

2. **Bloqueio de Pagamento:**
   - O sistema só deve permitir registrar pagamentos para inscrições que estejam no status **`CONFIRMADO`**. Inscrições em qualquer outro status (`PENDENTE`, `REJEITADA`, `EM_ANALISE`) devem bloquear novas transações financeiras de pagamento.

3. **Lógica de Estorno (Refund) Automático:**
   - Se uma inscrição que já foi confirmada e possui pagamentos vinculados for alterada pelo administrador para o status **`REJEITADA`**:
     - O sistema deve buscar todos os pagamentos (`PagamentoInscricao`) registrados para essa inscrição.
     - Para cada pagamento, deve gerar uma nova transação financeira de **`RECEITA`** com a descrição `"Estorno Pagamento Inscrição: <Nome do Evento>"` associada à pessoa, devolvendo integralmente o saldo.
     - Deve remover os registros de `PagamentoInscricao` correspondentes para zerar o valor pago visualmente no painel da inscrição, mantendo o histórico financeiro intacto na tabela de transações (`transacoes`).
     - A alteração do status e o estorno devem ocorrer de forma atômica dentro de uma **transação do banco de dados (Prisma `$transaction`)**.

---

## Análise de Possíveis Falhas e Brechas (Gaps)

Ao avaliar a regra descrita, identificamos alguns pontos de atenção e propomos soluções para garantir a excelência do sistema:

> [!IMPORTANT]
> **1. Re-confirmação de Inscrição Rejeitada:**
> Se uma inscrição for rejeitada (estornando os valores) e, por erro ou mudança de decisão, o administrador decidir confirmá-la novamente, ela voltará ao status `CONFIRMADO` com **R$ 0,00 pagos**. O usuário precisará realizar o pagamento novamente usando o saldo estornado. Essa é a conduta financeiramente segura.
>
> **2. Validação Visual e Experiência do Usuário (UX) no Frontend:**
> No frontend, não basta apenas o backend rejeitar o pagamento. O botão de adicionar pagamento e o formulário devem exibir claramente alertas informando se a inscrição não está confirmada, impedindo o envio precoce.
>
> **3. Exclusão de Inscrições Rejeitadas:**
> Ao rejeitar a inscrição, removemos os registros de `PagamentoInscricao` (zerando-a). Isso resolve o problema de integridade referencial do banco de dados que causava erro 500 ao tentar excluir registros vinculados, pois agora a inscrição sem pagamentos ativos poderá ser removida de forma limpa pelo administrador caso desejado.

---

## Alterações Propostas

### Backend (NestJS & Prisma)

#### [MODIFY] [schema.prisma](file:///c:/Projetos/GF/api/prisma/schema.prisma)
- Alterar o enum `StatusInscricao` para incluir os novos valores e remover o antigo:
  ```prisma
  enum StatusInscricao {
    PENDENTE
    CONFIRMADO
    REJEITADA
    EM_ANALISE
  }
  ```

#### [MODIFY] [update-status-inscricao.dto.ts](file:///c:/Projetos/GF/api/src/inscricoes/dto/update-status-inscricao.dto.ts)
- Atualizar a validação `@IsEnum` para aceitar `['PENDENTE', 'CONFIRMADO', 'REJEITADA', 'EM_ANALISE']` e ajustar a mensagem de erro.

#### [MODIFY] [inscricoes.service.ts](file:///c:/Projetos/GF/api/src/inscricoes/inscricoes.service.ts)
- **Método `adicionarPagamento`:**
  - Adicionar validação:
    ```typescript
    if (inscricao.status !== 'CONFIRMADO') {
      throw new BadRequestException('Não é possível realizar pagamentos para inscrições que não estão confirmadas.');
    }
    ```
- **Método `atualizarStatus`:**
  - Modificar para verificar se o novo status é `REJEITADA`.
  - Caso seja `REJEITADA`, executar dentro de uma transação Prisma:
    1. Buscar a inscrição com seus `pagamentos` e dados do `evento` e `pessoa`.
    2. Se houver pagamentos:
       - Criar uma nova `Transacao` de tipo `RECEITA` para cada pagamento correspondente, contendo o valor do estorno e descrição apropriada.
       - Deletar todos os registros de `PagamentoInscricao` associados a essa inscrição.
    3. Atualizar o status da inscrição para `REJEITADA` (ou para o status enviado se for outro).

---

### Frontend (NextJS)

#### [MODIFY] [page.tsx (Inscrições)](file:///c:/Projetos/GF/web/src/app/(dashboard)/inscricoes/page.tsx)
- **Visualização de Status:**
  - Mapear os badges de status com cores harmoniosas e modernas:
    - `CONFIRMADO` -> Verde (`bg-emerald-50 text-emerald-600 border-emerald-100`)
    - `PENDENTE` -> Cinza (`bg-slate-50 text-slate-400 border-slate-200`)
    - `EM_ANALISE` -> Indigo/Roxo (`bg-indigo-50 text-indigo-600 border-indigo-100`) - indicando pendência de análise.
    - `REJEITADA` -> Vermelho/Rosa (`bg-rose-50 text-rose-600 border-rose-100`)
- **Ações Administrativas (Gestão):**
  - Exibir botões rápidos e intuitivos na lista baseados no status atual:
    - Botão de Confirmar (ícone `CheckCircle2`, cor verde) - disponível se status for diferente de `CONFIRMADO`.
    - Botão de Analisar (ícone `Search` ou `AlertCircle`, cor roxo/indigo) - disponível se status for diferente de `EM_ANALISE`.
    - Botão de Rejeitar (ícone `XCircle` ou `X`, cor vermelha) - disponível se status for diferente de `REJEITADA`.
- **Modal de Pagamentos:**
  - Adicionar um banner informativo destacado no topo do formulário de pagamento caso a inscrição não esteja com status `CONFIRMADO`, desabilitando o botão de envio de pagamento com a mensagem explicativa "Apenas inscrições CONFIRMADAS podem receber pagamentos".

#### [MODIFY] [page.tsx (Meu Painel)](file:///c:/Projetos/GF/web/src/app/(dashboard)/meu-painel/page.tsx)
- Atualizar a exibição dos badges de status no painel do participante para suportar `EM_ANALISE` ("Em Análise") e `REJEITADA` ("Rejeitada") com os mesmos estilos elegantes e consistentes.

---

## Plano de Verificação

### 1. Migração do Banco de Dados
- Executar os comandos de banco de dados para aplicar as mudanças de enum e gerar a migration correspondente.

### 2. Testes Automatizados / Script de Integração
- Adaptar o arquivo `test-eventos-pagamentos.ts` para validar o fluxo:
  - Validar rejeição de pagamentos em inscrições `PENDENTE`.
  - Confirmar inscrição e validar pagamento com sucesso.
  - Alterar status para `REJEITADA` e validar que as transações de `RECEITA` (estorno) foram criadas e o saldo da pessoa retornou ao valor original.
  - Validar que a lista de pagamentos da inscrição foi zerada.

### 3. Verificação Manual
- Navegar pelo painel de administração de inscrições no navegador.
- Testar a alteração de status de uma inscrição para `EM_ANALISE`, `CONFIRMADO` e `REJEITADA`.
- Verificar o comportamento do modal de pagamentos e a atualização de saldos em tempo real.
