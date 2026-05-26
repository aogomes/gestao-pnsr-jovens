# Guia de Deploy - Sistema de Rifas (GF)

Este guia descreve o processo para publicar o sistema de rifas em um ambiente gratuito utilizando as melhores práticas de mercado.

---

## 🏗️ Arquitetura de Produção Recomendada

Para manter o sistema 100% gratuito, utilizaremos três plataformas distintas:

1.  **Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL)
2.  **Back-end (API):** [Render](https://render.com/) (NestJS/Node.js)
3.  **Front-end (Web):** [Vercel](https://vercel.com/) (Next.js)

---

## 📡 Passo 1: Configuração do Banco de Dados (Supabase)

1.  Crie uma conta no **Supabase**.
2.  Crie um novo projeto (ex: `rifas-db`).
3.  Vá em **Project Settings > Database**.
4.  Copie a **Connection String** (URI) do campo "Connection string" (certifique-se de usar o modo `Transaction` ou `Session` conforme necessário, geralmente o padrão funciona bem).
5.  Sua URL será algo como: `postgresql://postgres:[SENHA]@db.[ID].supabase.co:5432/postgres`

---

## ⚙️ Passo 2: Preparação do Back-end (API) no Render

1.  Crie uma conta no **Render**.
2.  Crie um novo **Web Service**.
3.  Conecte seu repositório do GitHub e selecione a pasta `api`.
4.  **Configurações de Build:**
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install && npm run build`
    *   **Start Command:** `npm run start:prod`
5.  **Environment Variables (Advanced):**
    *   `DATABASE_URL`: A URL que você copiou do Supabase.
    *   `JWT_SECRET`: Uma senha forte e aleatória para os tokens.
    *   `PORT`: `3000` (ou deixe o padrão do Render).
6.  Aguarde o deploy e anote a URL gerada (ex: `https://rifa-api.onrender.com`).

---

## 💻 Passo 3: Preparação do Front-end (Web) no Vercel

1.  Crie uma conta no **Vercel**.
2.  Importe seu repositório do GitHub e selecione a pasta `web`.
3.  **Configurações de Build:** O Vercel detectará automaticamente que é um projeto Next.js.
4.  **Environment Variables:**
    *   `NEXT_PUBLIC_API_URL`: Insira a URL da sua API no Render (ex: `https://rifa-api.onrender.com/api/v1`).
5.  Clique em **Deploy**.

---

## 🚀 Passo Final: Migração do Banco de Dados

Após configurar a API no Render com a URL do Supabase, você precisa subir as tabelas:

1.  No seu terminal local, na pasta `api`, altere temporariamente o seu `.env` para a URL do Supabase.
2.  Execute: `npx prisma migrate deploy`
3.  (Opcional) Execute o seed se quiser dados iniciais: `npm run seed`

---

## ⚠️ Observações Importantes

*   **API Sleeping:** O Render (plano gratuito) coloca a API para dormir após 15 minutos de inatividade. O primeiro acesso do dia pode demorar cerca de 30 segundos.
*   **Keep Alive:** Você pode usar o site [Cron-job.org](https://cron-job.org/) para fazer um "ping" na URL da sua API a cada 14 minutos e mantê-la sempre acordada.
*   **Segurança:** Nunca suba o arquivo `.env` para o GitHub. Use as configurações de variáveis de ambiente diretamente nos painéis da Vercel e Render.

---

*Guia gerado por Antigravity em 05/05/2026.*
