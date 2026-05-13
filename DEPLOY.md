# 🚀 Como colocar A Estrategista no ar (100% Cloudflare)

## O que você precisa ter instalado
- Node.js (https://nodejs.org)
- Git

---

## ETAPA 1 — Enviar o código para o GitHub

No terminal, dentro da pasta do projeto:

```bash
cd andressamallinsk.ia
git add .
git commit -m "Migração backend para Cloudflare Worker"
git push origin main
```

Isso vai atualizar o repositório. O Cloudflare Pages vai fazer o rebuild do frontend automaticamente.

---

## ETAPA 2 — Instalar o Wrangler (ferramenta da Cloudflare)

```bash
npm install -g wrangler
wrangler login
```

O segundo comando vai abrir o navegador para você fazer login na sua conta Cloudflare.

---

## ETAPA 3 — Colocar o ID do banco D1 no wrangler.toml

1. Acesse https://dash.cloudflare.com
2. Vá em **Workers & Pages → D1**
3. Clique no banco `estrategista`
4. Copie o **Database ID**
5. Abra o arquivo `worker/wrangler.toml` e substitua:
   ```
   database_id = "SEU_DATABASE_ID_AQUI"
   ```
   pelo ID que você copiou.

---

## ETAPA 4 — Fazer o deploy do Worker

```bash
cd worker
npm install
wrangler deploy
```

No final vai aparecer a URL do seu Worker, algo como:
```
https://estrategista-api.SEU-NOME.workers.dev
```
**Guarde essa URL!**

---

## ETAPA 5 — Configurar os Secrets do Worker

Ainda dentro da pasta `worker`, rode esses comandos um por vez:

```bash
wrangler secret put GEMINI_API_KEY
```
Cole sua chave do Google AI Studio quando pedir.

```bash
wrangler secret put JWT_SECRET
```
Cole qualquer string longa e aleatória (ex: gere em https://1password.com/password-generator/).

---

## ETAPA 6 — Configurar a URL do backend no Cloudflare Pages

1. Acesse https://dash.cloudflare.com
2. Vá em **Workers & Pages → Pages → andressamallinsk-ia**
3. Clique em **Settings → Environment Variables**
4. Adicione (ou atualize):
   - Nome: `REACT_APP_BACKEND_URL`
   - Valor: `https://estrategista-api.SEU-NOME.workers.dev`
5. Clique em **Save**
6. Vá em **Deployments → Retry deployment**

---

## ETAPA 7 — Criar as tabelas no banco D1 (só se o banco estiver vazio)

Se o banco já tem dados, pule este passo.

Se for um banco novo:
1. Acesse https://dash.cloudflare.com → **Workers & Pages → D1**
2. Clique no banco → **Console**
3. Cole o conteúdo do arquivo `backend/schema.sql` e execute

---

## ✅ Pronto!

O sistema agora roda 100% na Cloudflare:
- **Frontend** → Cloudflare Pages (rebuild automático a cada push)
- **Backend** → Cloudflare Worker (sem servidor, nunca dorme)
- **Banco de dados** → Cloudflare D1

Qualquer dúvida, chame! 🙂
