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
4. **Biblioteca de Conteúdo** - Geração de temas para Reels, Carrossel, Post Estático, Stories, ADS
5. **Análise de Perfil** - Upload de screenshot + análise IA + mockup visual do perfil melhorado
6. **Criar Ensaio Fotográfico** - Geração de imagens profissionais com Gemini Nano Banana
7. **Exterminador de Objeção** - Análise de conversa e script para quebrar objeções
8. **Funil de Vendas** - Construtor interativo + visualizador gráfico de funil
9. **Editor Nano Banana** - Editor de imagens com comandos de texto

### Integrações
- Gemini (gemini-3-flash-preview) - Chat e análise de texto
- Gemini Nano Banana (gemini-3-pro-image-preview) - Geração e edição de imagens
- Google Calendar - Lembretes de follow-up (parcialmente implementado)

## Arquitetura Técnica

### Stack
- **Frontend:** React.js com Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **AI:** emergentintegrations library com EMERGENT_LLM_KEY

### Estrutura de Arquivos
```
/app
├── backend/
│   ├── server.py       # API endpoints
│   └── .env            # Configurações
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Dashboard.js
│       │   ├── EstrategistaDigital.js
│       │   ├── ContentLibrary.js
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

### Concluído (05/02/2026)
- [x] Autenticação JWT (login/registro)
- [x] Dashboard de Metas com ações semanais
- [x] CRM Kanban com drag-and-drop
- [x] Estrategista Digital (chat IA)
- [x] Biblioteca de Conteúdo (geração de temas e roteiros)
- [x] **Funil de Vendas** - Construtor interativo com visualização gráfica
- [x] **Criar Ensaio Fotográfico** - Geração de imagens com Nano Banana
- [x] **Editor Nano Banana** - Edição de imagens com IA
- [x] **Análise de Perfil** - Análise textual + geração de mockup visual
- [x] Exterminador de Objeção (análise de print de conversa)

### Parcialmente Implementado
- [ ] Google Calendar - OAuth configurado, falta conexão completa

### Backlog (P2)
- [ ] Persistência de dados em localStorage para cache offline
- [ ] Histórico de conversas do chat
- [ ] Export de funil em PDF
- [ ] Notificações push para follow-up

## APIs Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| /api/auth/login | POST | Login com JWT |
| /api/auth/register | POST | Registro de usuário |
| /api/leads | GET/POST/PATCH | Gestão de leads |
| /api/ai/chat | POST | Chat com Estrategista |
| /api/ai/build-funnel | POST | Construtor de funil |
| /api/ai/generate-themes | POST | Geração de temas |
| /api/ai/generate-photoshoot | POST | Geração de ensaio |
| /api/ai/edit-image | POST | Edição de imagem |
| /api/ai/analyze-profile | POST | Análise de perfil |
| /api/ai/analyze-objection | POST | Análise de objeção |

## Credenciais de Teste
- Email: test@test.com
- Senha: test123

## Notas Técnicas
- Modelo para texto: gemini-3-flash-preview
- Modelo para imagens: gemini-3-pro-image-preview (Nano Banana)
- Imagens retornadas em base64
- Todas as chamadas de IA usam EMERGENT_LLM_KEY
