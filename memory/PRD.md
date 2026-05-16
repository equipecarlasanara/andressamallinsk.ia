# Segundo Cérebro da Estrategista - PRD

## Problema Original
Construir uma aplicação "segundo cérebro da estrategista" - uma plataforma de estratégia de negócios com IA para empreendedoras, baseada na metodologia de Andressa Mallinsk.

## Requisitos do Produto

### Branding
- Nome: "ESTRATEGISTA" em cor dourada (#D4AF37)
- Subtítulo: "by Andressa Mallinsk"
- Tema escuro com cores: #19161B (dark), #D4AF37 (gold), #3A0A16 (red)

### Funcionalidades Core

1. **Dashboard de Metas** - Tela inicial com metas e progresso
2. **CRM Kanban** - Gerenciamento de leads com drag-and-drop (Novo Lead, Em Contato, Negociação, Fechado)
3. **Estrategista Digital** - Chat IA treinado com metodologia Andressa Mallinsk
   - Cada mentorada faz upload do seu **Plano de Ação Individual (PDF)**
   - A IA lê o plano e faz perguntas inteligentes como: "A partir desse material, gostaria de receber as ações da semana?"
   - As ações geradas aparecem automaticamente no Dashboard de Metas (ações semanais)
   - Todo o contexto do chat é personalizado com base no plano da mentorada
   - O plano fica salvo por usuário no banco D1 (cada mentorada tem o seu próprio)
4. **Biblioteca de Conteúdo** - Geração de temas para Reels, Carrossel, Post Estático, Stories, ADS
   - Temas e roteiros gerados com base no **posicionamento do Plano de Ação** da mentorada
   - Se não houver plano enviado, solicita o upload antes de gerar conteúdo
5. **Análise de Perfil** - Upload de screenshot + análise IA + mockup visual do perfil melhorado
6. **Criar Ensaio Fotográfico** - Geração de imagens profissionais com Gemini
7. **Exterminador de Objeção** - Análise de conversa e script para quebrar objeções
8. **Funil de Vendas** - Construtor interativo + visualizador gráfico de funil
9. **Editor de Imagens** - Editor de imagens com comandos de texto

### Integrações
- Gemini (gemini-2.0-flash) - Chat e análise de texto + leitura de PDF
- Gemini (gemini-2.0-flash-preview-image-generation) - Geração e edição de imagens
- Cloudflare D1 - Banco de dados (usuários, leads, metas, planos de ação, histórico de chat)
- Cloudflare Workers - Backend 100% serverless

## Arquitetura Técnica

### Stack
- **Frontend:** React.js com Tailwind CSS
- **Backend:** Cloudflare Worker (JavaScript)
- **Database:** Cloudflare D1 (SQLite serverless)
- **AI:** Google Gemini API (GEMINI_API_KEY)
- **Hosting:** Cloudflare Pages (frontend) + Cloudflare Workers (backend)
- **Domínio:** ia.andressamallinsk.com.br

### Fluxo do Plano de Ação Individual
1. Mentorada faz login
2. Na Estrategista Digital, faz upload do PDF do seu plano de ação
3. O PDF é convertido em base64 e enviado ao Worker
4. O Worker salva o conteúdo extraído na tabela `action_plans` (D1), vinculado ao user_id
5. A IA lê o plano e pergunta: "A partir desse material, gostaria de receber as ações da semana?"
6. Se sim, gera as ações e salva em `weekly_actions` (aparece no Dashboard)
7. Em toda conversa futura, o sistema carrega o plano como contexto
8. Na Biblioteca de Conteúdo, o plano é usado como base para gerar temas personalizados

### Estrutura de Arquivos
```
/
├── worker/
│   ├── src/
│   │   └── index.js      # Backend completo (Cloudflare Worker)
│   └── wrangler.toml     # Config do Worker + D1
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Dashboard.js
│       │   ├── EstrategistaDigital.js   # + upload de plano de ação
│       │   ├── ContentLibrary.js        # + personalização por plano
│       │   ├── GoalsDashboard.js
│       │   ├── ProfileAnalysis.js
│       │   ├── PhotoshootCreator.js
│       │   ├── ObjectionExterminator.js
│       │   ├── SalesFunnel.js
│       │   ├── ImageEditor.js
│       │   └── Sidebar.js
│       └── App.js
└── memory/
    └── PRD.md
```

## Status de Implementação

### Concluído
- [x] Autenticação JWT (login/registro)
- [x] Dashboard de Metas com ações semanais
- [x] CRM Kanban com drag-and-drop
- [x] Estrategista Digital (chat IA)
- [x] Biblioteca de Conteúdo (geração de temas e roteiros)
- [x] Funil de Vendas - Construtor interativo com visualização gráfica
- [x] Criar Ensaio Fotográfico - Geração de imagens
- [x] Editor de Imagens com IA
- [x] Análise de Perfil - Análise textual + geração de mockup visual
- [x] Exterminador de Objeção (análise de print de conversa)
- [x] Backend migrado para Cloudflare Worker (100% serverless, nunca dorme)

### Em Desenvolvimento
- [ ] Upload de Plano de Ação Individual (PDF) por mentorada
- [ ] Estrategista Digital personalizada pelo plano de ação
- [ ] Biblioteca de Conteúdo personalizada pelo posicionamento do plano
- [ ] Ações da semana geradas automaticamente do plano → Dashboard

### Backlog (P2)
- [ ] Google Calendar - Lembretes de follow-up
- [ ] Export de funil em PDF
- [ ] Histórico completo de conversas

## APIs Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| /api/auth/login | POST | Login com JWT |
| /api/auth/register | POST | Registro de usuário |
| /api/leads | GET/POST/PATCH/DELETE | Gestão de leads |
| /api/goals | GET/POST/PATCH | Metas mensais |
| /api/weekly-actions | GET/POST/PATCH/DELETE | Ações semanais |
| /api/action-plan | GET/POST | Plano de ação individual (PDF) |
| /api/ai/chat | POST | Chat com Estrategista (usa plano como contexto) |
| /api/ai/build-funnel | POST | Construtor de funil |
| /api/ai/generate-themes | POST | Geração de temas (baseada no plano) |
| /api/ai/generate-content | POST | Geração de roteiros |
| /api/ai/generate-photoshoot | POST | Geração de ensaio |
| /api/ai/edit-image | POST | Edição de imagem |
| /api/ai/analyze-profile | POST | Análise de perfil |
| /api/ai/analyze-objection | POST | Análise de objeção |

## Schema D1 (Banco de Dados)

```sql
-- Usuários
CREATE TABLE users (id, email, name, password, created_at);

-- Metas mensais
CREATE TABLE goals (id, user_id, monthly_target, current_revenue, month, year, created_at, updated_at);

-- Ações semanais
CREATE TABLE weekly_actions (id, user_id, title, description, completed, week_start, created_at, updated_at);

-- Leads / CRM
CREATE TABLE leads (id, user_id, name, phone, stage, notes, followup_date, created_at, updated_at);

-- Conteúdos gerados
CREATE TABLE content_items (id, user_id, title, content_type, theme, description, generated_content, created_at);

-- Histórico de chat
CREATE TABLE chat_history (session_id, user_id, history, created_at);

-- NOVO: Plano de ação individual por mentorada
CREATE TABLE action_plans (id, user_id, filename, content, uploaded_at);
```

## Notas Técnicas
- Modelo para texto: gemini-2.0-flash
- Modelo para imagens: gemini-2.0-flash-preview-image-generation
- PDFs enviados em base64 para o Gemini (suporte nativo)
- Domínio: ia.andressamallinsk.com.br (Cloudflare Pages)
- Worker: estrategista-api.andressamallinsk.workers.dev
