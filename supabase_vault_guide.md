# Guia de Configuração: Supabase Vault e Criptografia Transparente (TCE)

A Criptografia de Coluna Transparente (TCE) usando a extensão `pgsodium` do Supabase permite que os dados sejam salvos criptografados fisicamente, mas você continua interagindo com eles como se fossem texto normal. 

> [!IMPORTANT]
> **Atenção sobre o Prisma:** O Supabase implementa essa criptografia renomeando a sua tabela original (ex: `Pessoa`) e criando uma **View** (Visão) com o mesmo nome (`Pessoa`) no lugar. Essa View descriptografa os dados em tempo real. Por conta disso, você precisará ativar o suporte a Views no seu `schema.prisma` (`previewFeatures = ["views"]`) no futuro.

Aqui está o passo a passo exato para aplicar essa criptografia no seu painel do Supabase.

---

## Passo 1: Ativar o Supabase Vault
1. Acesse o painel do seu projeto no [Supabase](https://app.supabase.com).
2. No menu lateral esquerdo, clique no ícone de engrenagem **(Project Settings)**.
3. Acesse **Vault** (dentro da aba Configuration).
4. Se for a primeira vez, o Supabase pedirá para você ativar o Vault. Aceite.

## Passo 2: Criar uma Chave de Criptografia
1. Ainda na tela do **Vault**, vá para a aba **Encryption Keys**.
2. Clique em **Add new key**.
3. Dê um nome para a chave, por exemplo: `chave_dados_pessoais`.
4. O Supabase vai gerar um ID único para essa chave (um UUID, parecido com `123e4567-e89b-12d3-a456-426614174000`). **Copie e guarde este ID da chave.**

## Passo 3: Preparar o Banco (Via SQL Editor)
Vá para a tela de **SQL Editor** no painel do Supabase, crie uma nova query e cole o script abaixo. 
**Substitua `<COLE_O_ID_DA_CHAVE_AQUI>` pelo ID que você copiou no Passo 2.**

```sql
-- 1. Garanta que a extensão pgsodium está ativada
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 2. Informe ao pgsodium para criptografar as colunas sensíveis da tabela "Pessoa"
-- ATENÇÃO: Substitua o KEY_ID abaixo!
SECURITY LABEL FOR pgsodium ON COLUMN "Pessoa"."documento" IS 'ENCRYPT WITH KEY ID <COLE_O_ID_DA_CHAVE_AQUI>';
SECURITY LABEL FOR pgsodium ON COLUMN "Pessoa"."rg" IS 'ENCRYPT WITH KEY ID <COLE_O_ID_DA_CHAVE_AQUI>';
SECURITY LABEL FOR pgsodium ON COLUMN "Pessoa"."passaporte" IS 'ENCRYPT WITH KEY ID <COLE_O_ID_DA_CHAVE_AQUI>';
SECURITY LABEL FOR pgsodium ON COLUMN "Pessoa"."necessidadesMedicas" IS 'ENCRYPT WITH KEY ID <COLE_O_ID_DA_CHAVE_AQUI>';
```

## Passo 4: Aplicar a Criptografia (Migração do pgsodium)
Após rodar o script acima, o `pgsodium` já sabe o que fazer. Agora precisamos mandar ele efetivamente criar a proteção.

No **SQL Editor**, rode:
```sql
-- Isso cria a View transparente e criptografa os dados existentes
SELECT pgsodium.update_masks();
```

---

## 🎯 O que acontece após o Passo 4?
1. O Supabase renomeará a sua tabela `"Pessoa"` fisicamente para um nome interno protegido.
2. Ele criará uma View de leitura e escrita chamada `"Pessoa"` (que fará a criptografia/descriptografia em tempo real utilizando a chave guardada no Vault).
3. Se você tentar ler a tabela física restrita sem a chave, os RGs e documentos estarão parecendo "lixo eletrônico" (bytes criptografados).

## ⚠️ Passo 5: Ajustando o Prisma (Na nossa API)
Depois que você fizer isso no painel, teremos que ajustar o código do servidor. O Prisma precisará ser avisado que `Pessoa` agora é uma View. Teremos que adicionar o seguinte ao `schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["views"]
}
```
E converter a estrutura do `model Pessoa` para uma `view Pessoa`. 

**Recomendação:** Aconselho fazer esse procedimento em um banco de dados de testes (staging) no Supabase antes de aplicar no banco de produção principal, para garantirmos que o sistema da API e as importações continuem funcionando com as Views sem causar interrupções.
