# Guia de Publicação do Backend no Koyeb

Este guia vai te ajudar a migrar a sua API (Backend) do Render para o **Koyeb**, eliminando o problema de lentidão e "Cold Start" no plano gratuito.

## 🟢 Etapa 1: Preparando a API no Koyeb

1. Acesse o [Koyeb](https://app.koyeb.com/auth/signup) e crie uma conta gratuita conectando o seu GitHub.
   - *Nota: Eles podem pedir o cadastro de um cartão de crédito apenas por segurança contra bots, mas o plano **EcoFree** é 100% gratuito.*

2. No painel inicial (Dashboard), clique em **Create Service**.

3. Selecione a opção **GitHub** e escolha o seu repositório `gestao-pnsr-jovens` (ou o nome do seu repositório).

4. Na seção **Builder**, configure as seguintes opções:
   - **Build and run method**: Escolha `Buildpacks` (Como você não tem um Dockerfile na raiz, o Koyeb usará Buildpacks automaticamente).
   - **Work directory / Override root directory**: Ative a opção de sobrescrever o diretório raiz e digite `api` (Isso é crucial! O Koyeb precisa saber que seu backend está dentro da pasta `api`).
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm run start:prod` (Esse é o comando que roda o NestJS compilado em produção).

5. Na seção **Environment Variables** (Variáveis de Ambiente), adicione exatamente as mesmas que você usava no Render.
   - `DATABASE_URL`: `postgres://...` (A mesma URL de conexão com o banco de dados que você usa hoje)
   - `JWT_SECRET`: (Sua chave secreta do JWT)
   *(Adicione qualquer outra variável de ambiente que sua API necessite).*

6. Na seção **Instance**, certifique-se de que a opção **EcoFree** está selecionada (512MB RAM, 0.1 vCPU).

7. Na seção **Exposed Ports**:
   - Certifique-se de expor a porta que a sua API usa. Por padrão no seu código NestJS costuma ser a `3000`. 
   - Se o seu arquivo `main.ts` na pasta `api` tem algo como `process.env.PORT || 3000`, configure no Koyeb para mapear a porta `3000`.

8. Dê um nome ao seu App (ex: `api-gestao-pnsr`) e clique em **Deploy**.

> [!TIP]
> O processo de build vai levar alguns minutos. O Koyeb vai baixar o Node, instalar pacotes, gerar o Prisma (`prisma generate`) e rodar o `nest build`. Quando terminar, o status ficará verde ("Healthy") e você terá uma URL pública. **Copie essa URL!**

---

## 🔵 Etapa 2: Atualizando o Frontend (Vercel)

Agora que sua API está rodando no Koyeb, você precisa avisar o seu site na Vercel para conversar com a URL nova.

1. Acesse o seu painel na [Vercel](https://vercel.com/dashboard) e clique no projeto do seu Front-end (`web-gestao-pnsr`).
2. Vá na aba **Settings** (Configurações) no topo e depois em **Environment Variables** no menu lateral.
3. Encontre a variável de ambiente que guarda a URL da sua API (ex: `NEXT_PUBLIC_API_URL` ou algo semelhante que você já tinha configurado).
4. Clique nos **3 pontinhos** do lado dela e selecione **Edit**.
5. Troque a URL antiga do Render pela **nova URL do Koyeb**.
   *(Não se esqueça de manter o `/api/v1` ou rotas adicionais no final, caso seu Frontend dependa disso).*
6. Clique em **Save**.

> [!IMPORTANT]
> Apenas mudar a variável não atualiza o site que já está no ar. Você precisa forçar a Vercel a reconstruir o site para ele "puxar" essa URL nova!

7. Volte para a aba **Deployments** (no menu superior do seu projeto na Vercel).
8. Clique nos **3 pontinhos** do lado do último deploy que deu certo e escolha **Redeploy**.

Espere 2 a 3 minutinhos e pronto! 🚀 O seu sistema estará utilizando a API no Koyeb e a lentidão brutal no acesso inicial vai desaparecer.
