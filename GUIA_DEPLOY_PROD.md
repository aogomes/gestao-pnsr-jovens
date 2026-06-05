# Guia de Publicação na Nuvem (Gratuito)

Este guia vai te ensinar o passo a passo para colocar a sua API e a sua interface Web no ar. Nós já preparamos todo o código no GitHub, então agora é só "plugar" os serviços.

---

## 🟢 Etapa 1: Publicando a API (Backend) no Render.com

A API precisa ir ao ar primeiro, pois o Frontend dependerá da URL dela para funcionar.

1. Acesse o [Render.com](https://dashboard.render.com/register) e crie uma conta (faça login com o GitHub).
2. No painel (Dashboard), clique no botão **New +** no canto superior direito e escolha **Web Service**.
3. Selecione a opção **"Build and deploy from a Git repository"** e clique em **Next**.
4. Conecte sua conta do GitHub e selecione o repositório **`gestao-pnsr-jovens`** (ou o nome do seu projeto no GitHub).

### Configurações do Web Service:
- **Name**: `api-gestao-pnsr` (ou outro nome de sua escolha)
- **Root Directory**: `api` *(Muito importante!)*
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`
- **Plan**: Escolha o plano **Free** ($0/month).

### Variáveis de Ambiente (Environment Variables):
Role a página até o final, clique em **Advanced** e adicione as variáveis que estão no seu arquivo `.env`:
- `DATABASE_URL`: `postgres://avnadmin:...` *(Copie e cole a mesma URL que já configuramos para o seu Aiven Cloud)*
- `JWT_SECRET`: *(A sua chave JWT se aplicável no arquivo local)*

> [!TIP]
> Clique em **Create Web Service** e aguarde de 2 a 5 minutos. O Render fará o download do seu código, irá rodar a instalação e iniciar a sua API. Ao final, no canto superior esquerdo aparecerá a URL da sua API (algo como `https://api-gestao-pnsr.onrender.com`). **Copie essa URL**, pois você precisará dela na Etapa 2!

---

## 🔵 Etapa 2: Publicando o Web (Frontend) na Vercel

Agora que a API está viva, vamos publicar a "cara" do seu sistema.

1. Acesse a [Vercel](https://vercel.com/signup) e crie uma conta gratuita (login com GitHub).
2. No painel principal, clique no botão preto **Add New...** e depois em **Project**.
3. Em "Import Git Repository", localize o seu repositório e clique em **Import**.

### Configurações do Projeto Vercel:
- **Project Name**: `web-gestao-pnsr`
- **Framework Preset**: Deixe como `Next.js`
- **Root Directory**: Clique em **Edit** e selecione a pasta `web`.

### Variáveis de Ambiente (Environment Variables):
Abra a sanfona de "Environment Variables" e adicione:
- **Name**: `NEXT_PUBLIC_API_URL`
- **Value**: A URL do seu Render criada na Etapa 1.
  *(Exemplo: `https://api-gestao-pnsr.onrender.com/api/v1`)*

> [!IMPORTANT]
> Lembre-se de adicionar o `/api/v1` no final da URL no Value, pois este é o caminho base das suas rotas.

4. Clique no botão **Deploy** e espere a mágica acontecer!

Em poucos minutos, a Vercel vai te mostrar confetes na tela e fornecer um domínio gratuito (ex: `app-pnsrjmj.vercel.app`) onde você e todos da paróquia poderão acessar o sistema de qualquer lugar do mundo! 🌍
