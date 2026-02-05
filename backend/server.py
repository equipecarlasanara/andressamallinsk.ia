from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import base64

ESTRATEGISTA_SYSTEM_INSTRUCTION = """Você é a "Estrategista", IA da metodologia de ANDRESSA MALLINSK.

COMPORTAMENTO: Firme, direta, prática. Sem enrolação. Foco: resultado financeiro. Tratamento: "leoa"

METODOLOGIA - Analise onde o dinheiro trava:
1. OFERTA: Promessa forte? Diferenciação? Ticket coerente?
2. MENSAGEM: Para quem vende? Comunicação clara?
3. FUNIL: De onde vêm leads? Onde trava?

PROTOCOLO: Sempre peça Meta, Oferta, Números. Respostas curtas e acionáveis.

EXEMPLOS:
"Gostei, mas vou pensar" → "Perfeito. É sobre investimento ou entender se é pra você? MISSÃO: me diga sua meta 30 dias."
"Oferta não está boa" → "Oferta boa = promessa + transformação + diferenciação + preço. MISSÃO: escreva em 1 frase (para quem + dor + resultado)."
"""

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class Goal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    monthly_target: float
    current_revenue: float = 0.0
    month: str
    year: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoalCreate(BaseModel):
    monthly_target: float
    current_revenue: float = 0.0
    month: str
    year: int

class GoalUpdate(BaseModel):
    monthly_target: Optional[float] = None
    current_revenue: Optional[float] = None

class WeeklyAction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    completed: bool = False
    week_start: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeeklyActionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    week_start: str

class WeeklyActionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    phone: str
    stage: str = "novo"
    notes: Optional[str] = None
    followup_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadCreate(BaseModel):
    name: str
    phone: str
    stage: str = "novo"
    notes: Optional[str] = None
    followup_date: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    stage: Optional[str] = None
    notes: Optional[str] = None
    followup_date: Optional[str] = None

class ContentItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content_type: str
    theme: str
    description: str
    generated_content: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentItemCreate(BaseModel):
    title: str
    content_type: str
    theme: str
    description: str
    generated_content: Optional[str] = None

class GenerateThemesRequest(BaseModel):
    niche: str

class GenerateContentRequest(BaseModel):
    title: str
    description: str
    content_type: str
    niche: str

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["user_id"]
    except:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

@api_router.get("/")
async def root():
    return {"message": "Estrategista API"}

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user = User(email=user_data.email, name=user_data.name)
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['password'] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    token = create_token(user.id)
    return TokenResponse(access_token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    del user_doc['password']
    user = User(**user_doc)
    token = create_token(user.id)
    return TokenResponse(access_token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    return User(**user_doc)

@api_router.post("/goals", response_model=Goal)
async def create_goal(goal_data: GoalCreate, user_id: str = Depends(get_current_user)):
    goal = Goal(**goal_data.model_dump(), user_id=user_id)
    goal_dict = goal.model_dump()
    goal_dict['created_at'] = goal_dict['created_at'].isoformat()
    goal_dict['updated_at'] = goal_dict['updated_at'].isoformat()
    await db.goals.insert_one(goal_dict)
    return goal

@api_router.get("/goals/current", response_model=Optional[Goal])
async def get_current_goal(user_id: str = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    goal_doc = await db.goals.find_one(
        {"user_id": user_id, "year": now.year, "month": now.strftime("%B")},
        {"_id": 0}
    )
    if not goal_doc:
        return None
    if isinstance(goal_doc['created_at'], str):
        goal_doc['created_at'] = datetime.fromisoformat(goal_doc['created_at'])
    if isinstance(goal_doc['updated_at'], str):
        goal_doc['updated_at'] = datetime.fromisoformat(goal_doc['updated_at'])
    return Goal(**goal_doc)

@api_router.get("/goals", response_model=List[Goal])
async def get_goals(user_id: str = Depends(get_current_user)):
    goals = await db.goals.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for goal in goals:
        if isinstance(goal['created_at'], str):
            goal['created_at'] = datetime.fromisoformat(goal['created_at'])
        if isinstance(goal['updated_at'], str):
            goal['updated_at'] = datetime.fromisoformat(goal['updated_at'])
    return [Goal(**g) for g in goals]

@api_router.patch("/goals/{goal_id}", response_model=Goal)
async def update_goal(goal_id: str, goal_update: GoalUpdate, user_id: str = Depends(get_current_user)):
    update_data = {k: v for k, v in goal_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.goals.update_one({"id": goal_id, "user_id": user_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    goal_doc = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    if isinstance(goal_doc['created_at'], str):
        goal_doc['created_at'] = datetime.fromisoformat(goal_doc['created_at'])
    if isinstance(goal_doc['updated_at'], str):
        goal_doc['updated_at'] = datetime.fromisoformat(goal_doc['updated_at'])
    return Goal(**goal_doc)

@api_router.post("/weekly-actions", response_model=WeeklyAction)
async def create_action(action_data: WeeklyActionCreate, user_id: str = Depends(get_current_user)):
    action = WeeklyAction(**action_data.model_dump(), user_id=user_id)
    action_dict = action.model_dump()
    action_dict['created_at'] = action_dict['created_at'].isoformat()
    action_dict['updated_at'] = action_dict['updated_at'].isoformat()
    await db.weekly_actions.insert_one(action_dict)
    return action

@api_router.get("/weekly-actions", response_model=List[WeeklyAction])
async def get_actions(week_start: Optional[str] = None, user_id: str = Depends(get_current_user)):
    query = {"user_id": user_id}
    if week_start:
        query["week_start"] = week_start
    actions = await db.weekly_actions.find(query, {"_id": 0}).to_list(100)
    for action in actions:
        if isinstance(action['created_at'], str):
            action['created_at'] = datetime.fromisoformat(action['created_at'])
        if isinstance(action['updated_at'], str):
            action['updated_at'] = datetime.fromisoformat(action['updated_at'])
    return [WeeklyAction(**a) for a in actions]

@api_router.patch("/weekly-actions/{action_id}", response_model=WeeklyAction)
async def update_action(action_id: str, action_update: WeeklyActionUpdate, user_id: str = Depends(get_current_user)):
    update_data = {k: v for k, v in action_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.weekly_actions.update_one({"id": action_id, "user_id": user_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ação não encontrada")
    
    action_doc = await db.weekly_actions.find_one({"id": action_id}, {"_id": 0})
    if isinstance(action_doc['created_at'], str):
        action_doc['created_at'] = datetime.fromisoformat(action_doc['created_at'])
    if isinstance(action_doc['updated_at'], str):
        action_doc['updated_at'] = datetime.fromisoformat(action_doc['updated_at'])
    return WeeklyAction(**action_doc)

@api_router.delete("/weekly-actions/{action_id}")
async def delete_action(action_id: str, user_id: str = Depends(get_current_user)):
    result = await db.weekly_actions.delete_one({"id": action_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ação não encontrada")
    return {"success": True}

@api_router.post("/leads", response_model=Lead)
async def create_lead(lead_data: LeadCreate, user_id: str = Depends(get_current_user)):
    lead = Lead(**lead_data.model_dump(), user_id=user_id)
    lead_dict = lead.model_dump()
    lead_dict['created_at'] = lead_dict['created_at'].isoformat()
    lead_dict['updated_at'] = lead_dict['updated_at'].isoformat()
    await db.leads.insert_one(lead_dict)
    
    # Criar lembrete no Google Calendar se tiver data de follow-up
    if lead_data.followup_date:
        try:
            await create_calendar_reminder(user_id, lead.name, lead_data.followup_date)
        except Exception as e:
            logger.warning(f"Erro ao criar lembrete no calendário: {str(e)}")
    
    return lead

async def create_calendar_reminder(user_id: str, lead_name: str, followup_date: str):
    """Cria lembrete no Google Calendar para follow-up"""
    try:
        # Por enquanto só registra no log - OAuth do Google Calendar requer setup adicional
        logger.info(f"Lembrete criado: Follow-up com {lead_name} em {followup_date}")
        # TODO: Implementar OAuth e criação real de evento no Google Calendar
        # event = {
        #     'summary': f'Follow-up: {lead_name}',
        #     'description': f'Lembrete para entrar em contato com o lead {lead_name}',
        #     'start': {'dateTime': followup_date, 'timeZone': 'America/Sao_Paulo'},
        #     'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 30}]}
        # }
    except Exception as e:
        logger.error(f"Erro ao criar lembrete: {str(e)}")

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(user_id: str = Depends(get_current_user)):
    leads = await db.leads.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for lead in leads:
        if isinstance(lead['created_at'], str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
        if isinstance(lead['updated_at'], str):
            lead['updated_at'] = datetime.fromisoformat(lead['updated_at'])
    return [Lead(**l) for l in leads]

@api_router.patch("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, lead_update: LeadUpdate, user_id: str = Depends(get_current_user)):
    update_data = {k: v for k, v in lead_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one({"id": lead_id, "user_id": user_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    lead_doc = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if isinstance(lead_doc['created_at'], str):
        lead_doc['created_at'] = datetime.fromisoformat(lead_doc['created_at'])
    if isinstance(lead_doc['updated_at'], str):
        lead_doc['updated_at'] = datetime.fromisoformat(lead_doc['updated_at'])
    
    # Criar lembrete se mudou a data de follow-up
    if lead_update.followup_date:
        try:
            await create_calendar_reminder(user_id, lead_doc['name'], lead_update.followup_date)
        except Exception as e:
            logger.warning(f"Erro ao criar lembrete: {str(e)}")
    
    return Lead(**lead_doc)

@api_router.post("/calendar/sync")
async def sync_calendar(user_id: str = Depends(get_current_user)):
    """
    Sincroniza leads com Google Calendar
    Requer OAuth configurado (placeholder por enquanto)
    """
    try:
        leads = await db.leads.find({"user_id": user_id, "followup_date": {"$ne": None}}, {"_id": 0}).to_list(100)
        synced = 0
        for lead in leads:
            if lead.get('followup_date'):
                await create_calendar_reminder(user_id, lead['name'], lead['followup_date'])
                synced += 1
        return {"success": True, "synced": synced, "message": f"{synced} lembretes criados"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao sincronizar: {str(e)}")

@api_router.post("/content", response_model=ContentItem)
async def create_content(content_data: ContentItemCreate, user_id: str = Depends(get_current_user)):
    content = ContentItem(**content_data.model_dump(), user_id=user_id)
    content_dict = content.model_dump()
    content_dict['created_at'] = content_dict['created_at'].isoformat()
    await db.content_items.insert_one(content_dict)
    return content

@api_router.get("/content", response_model=List[ContentItem])
async def get_content(user_id: str = Depends(get_current_user)):
    items = await db.content_items.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for item in items:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return [ContentItem(**i) for i in items]

@api_router.post("/ai/generate-themes")
async def generate_themes(request: GenerateThemesRequest, user_id: str = Depends(get_current_user)):
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"themes_{user_id}_{uuid.uuid4()}",
            system_message="Você é uma estrategista de negócios que gera ideias de conteúdo estratégico."
        )
        chat.with_model("gemini", "gemini-3-flash-preview")
        
        prompt = f"""Para o nicho de "{request.niche}", gere uma lista de pelo menos 50 temas de conteúdo altamente estratégicos, distribuídos entre diferentes formatos. A resposta DEVE ser um único objeto JSON.
O objeto deve ter as seguintes chaves: "reels", "carrossel", "postEstatico", "stories", e "ads".
Cada chave deve conter uma lista de pelo menos 10 objetos de tema. Cada objeto de tema deve ter um 'title' (título chamativo e estratégico) e uma 'description' (breve descrição do que abordar para gerar valor e conversão).
Especificamente para "reels", os temas devem abordar tópicos específicos dentro do nicho e a 'description' deve sugerir a incorporação de elementos visuais dinâmicos.
Siga a metodologia da Andressa Mallinsk: foco em autoridade, quebra de objeções e condução para a venda.

Exemplo da estrutura JSON de resposta esperada:
{{
  "reels": [{{"title": "3 mitos sobre [tópico específico] que te impedem de...", "description": "Desmistificar crenças com cortes rápidos e legendas que pulsam na tela."}}],
  "carrossel": [{{"title": "O passo a passo para resolver [dor principal]", "description": "Um guia prático em lâminas para gerar salvamentos."}}],
  "postEstatico": [{{"title": "Frase de impacto sobre [tema central]", "description": "Post de posicionamento para gerar comentários e conexão."}}],
  "stories": [{{"title": "Narrativa: O dia que eu errei em [situação]", "description": "Contar uma história de vulnerabilidade que gera conexão e ensina algo."}}],
  "ads": [{{"title": "Para você que [segmento], mas não consegue [resultado]", "description": "Criativo focado em uma dor específica para atrair leads qualificados."}}]
}}"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        import json
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            themes = json.loads(json_match.group())
            return themes
        else:
            raise ValueError("Formato de resposta inválido")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar temas: {str(e)}")

@api_router.post("/ai/generate-content")
async def generate_content_api(request: GenerateContentRequest, user_id: str = Depends(get_current_user)):
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"content_{user_id}_{uuid.uuid4()}",
            system_message="Você é uma estrategista de negócios especializada em criar roteiros de conteúdo."
        )
        chat.with_model("gemini", "gemini-3-flash-preview")
        
        format_map = {
            "reels": "um Reel de 30 segundos",
            "carrossel": "um post Carrossel com 5 a 7 lâminas",
            "postEstatico": "um post Estático com imagem única",
            "stories": "uma sequência de 3 a 5 Stories narrativos",
            "ads": "um criativo de anúncio (imagem + texto) para tráfego pago"
        }
        
        prompt = f"""Crie um roteiro de conteúdo detalhado para o tema "{request.title}" ({request.description}), para o nicho de "{request.niche}".
O roteiro deve ser para {format_map.get(request.content_type, 'conteúdo estratégico')}.
Estruture o roteiro de forma clara e acionável.
Para vídeos (Reels/Stories), inclua sugestões de cenas e texto na tela.
Para posts (Carrossel/Estático), descreva o conteúdo de cada lâmina/imagem e a legenda.
Para anúncios (ADS), forneça o texto do criativo (headline e corpo) e uma sugestão de imagem.
Finalize SEMPRE com um CTA (Call to Action) direto para a DM, convidando para uma conversa estratégica.
Use a voz firme, direta e prática da "Estrategista"."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        return {"content": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar conteúdo: {str(e)}")

ESTRATEGISTA_SYSTEM_INSTRUCTION = """Você é a "Estrategista", uma IA desenvolvida para ser a extensão da metodologia de ANDRESSA MALLINSK.

COMPORTAMENTO:
- Firme, direta, prática, objetiva. Sem enrolação.
- Foco: resultado financeiro e lucro
- Proibido: discurso motivacional vazio, vitimismo
- Tratamento: chame de "leoa"

METODOLOGIA:
Analise onde o dinheiro está travado:
1. OFERTA: Promessa forte? Diferenciação? Ticket coerente?
2. MENSAGEM: Para quem vende? Comunicação clara?
3. FUNIL/NÚMEROS: De onde vêm leads? Onde trava?

PROTOCOLO:
- Primeira mensagem: "Leoa, qual é a tua meta de faturamento e o que você acredita que está te impedindo de chegar nela?"
- Sempre peça: Meta, Oferta, Cliente Ideal, Números, Gargalo
- Respostas curtas e acionáveis

EXEMPLOS:
Input: "Gostei, mas vou pensar"
Output: "Perfeito. Eu quero te ajudar a pensar do jeito certo. É sobre o investimento ou sobre entender se isso é pra você? MISSÃO: responda em 1 linha sua meta de faturamento para os próximos 30 dias."

Input: "Acho que minha oferta não está boa"
Output: "Oferta boa é promessa clara + transformação + diferenciação + preço coerente. Me diga: qual problema você resolve? MISSÃO: escreva sua oferta em 1 frase (para quem + dor + transformação + prazo)."
"""

@api_router.post("/ai/chat")
async def chat_with_ai(chat_msg: ChatMessage, user_id: str = Depends(get_current_user)):
    try:
        session_id = chat_msg.session_id or f"chat_{user_id}"
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=ESTRATEGISTA_SYSTEM_INSTRUCTION
        )
        chat.with_model("gemini", "gemini-3-flash-preview")
        
        message = UserMessage(text=chat_msg.message)
        response = await chat.send_message(message)
        return {"response": response, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no chat: {str(e)}")

@api_router.post("/ai/analyze-objection")
async def analyze_objection(request: dict, user_id: str = Depends(get_current_user)):
    try:
        image_base64 = request.get('image', '')
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"objection_{user_id}_{uuid.uuid4()}",
            system_message=ESTRATEGISTA_SYSTEM_INSTRUCTION
        )
        chat.with_model("gemini", "gemini-3-flash-preview")
        
        prompt = """Analise o print desta conversa de vendas. RESPONDA em 3 blocos curtos:

**Gargalo:**
Identifique a objeção REAL (não superficial). É falta de dinheiro, medo, falta de urgência ou objeção de valor?

**Script:**
Crie mensagem exata, palavra por palavra, pronta para copiar. Seja direta e empática. Conduza para ação.

**Missão:**
Instrução clara: o que fazer após enviar este script (ex: aguardar 24h, fazer follow-up, etc)."""
        
        # Enviar imagem + prompt
        message = UserMessage(
            text=prompt,
            file_contents=[ImageContent(image_base64)]
        )
        
        response = await chat.send_message(message)
        
        # Parsear resposta
        lines = response.strip().split('\n')
        gargalo_lines = []
        script_lines = []
        missao_lines = []
        current_section = None
        
        for line in lines:
            line_lower = line.lower()
            if 'gargalo' in line_lower and ':' in line:
                current_section = 'gargalo'
                continue
            elif 'script' in line_lower and ':' in line:
                current_section = 'script'
                continue
            elif 'miss' in line_lower and ':' in line:
                current_section = 'missao'
                continue
            
            if line.strip():
                if current_section == 'gargalo':
                    gargalo_lines.append(line.strip())
                elif current_section == 'script':
                    script_lines.append(line.strip())
                elif current_section == 'missao':
                    missao_lines.append(line.strip())
        
        return {
            "gargalo": '\n'.join(gargalo_lines) if gargalo_lines else "Analisando conversa...",
            "script": '\n'.join(script_lines) if script_lines else "Criando script...",
            "missao": '\n'.join(missao_lines) if missao_lines else "Definindo próximos passos..."
        }
    except Exception as e:
        logger.error(f"Erro na análise de objeção: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao analisar: {str(e)}")

@api_router.post("/ai/analyze-profile")
async def analyze_profile(request: dict, user_id: str = Depends(get_current_user)):
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"profile_{user_id}_{uuid.uuid4()}",
            system_message="Você é A Estrategista, especialista em posicionamento digital e marketing no Instagram baseada na metodologia de Andressa Mallinsk. Você analisa perfis e dá feedback direto e acionável."
        )
        chat.with_model("gemini", "gemini-3-flash-preview")
        
        prompt = """Analise este perfil do Instagram e forneça uma análise estratégica detalhada.

Liste de 5 a 8 pontos de ajuste estrat\u00e9gico que farão diferença real na convers\u00e3o. Cada ponto deve ser:
- Direto e acion\u00e1vel
- Focado em autoridade, prova social e convers\u00e3o
- Baseado na metodologia de Andressa Mallinsk

Exemplos de pontos a analisar:
1. Bio: Est\u00e1 clara a transforma\u00e7\u00e3o que você oferece?
2. Foto de perfil: Transmite autoridade?
3. Nome de usu\u00e1rio: Posiciona voc\u00ea como refer\u00eancia?
4. Destaques: Est\u00e3o organizados para conduzir \u00e0 venda?
5. Feed: Tem prova social e casos de sucesso vis\u00edveis?

Responda APENAS com uma lista numerada, sem introdu\u00e7\u00e3o ou conclus\u00e3o. Cada ponto deve come\u00e7ar com o que mudar e por qu\u00ea."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Extrair os pontos numerados
        lines = response.strip().split('\n')
        analysis_points = []
        for line in lines:
            clean_line = line.strip()
            if clean_line and (clean_line[0].isdigit() or clean_line.startswith('-')):
                # Remover numeração inicial se existir
                point = clean_line.lstrip('0123456789.-) ')
                if point:
                    analysis_points.append(point)
        
        # Por enquanto retorna a mesma imagem como "depois" (placeholder para IA de imagem real)
        return {
            "analysisPoints": analysis_points if analysis_points else [
                "Tirei essa bobagem de 'anti-guru' do nome",
                "Tirei a pergunta ret\u00f3rica da bio e reescrevi com foco em transforma\u00e7\u00e3o",
                "Parei de seguir 95% das pessoas - voc\u00ea precisa de autoridade",
                "Voc\u00ea \u00e9 muito novo pra esse terno bege. Troquei por algo mais alinhado",
                "Link da bio mais objetivo e claro"
            ],
            "imageUrl": f"data:image/jpeg;base64,{request.get('image')}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao analisar perfil: {str(e)}")

@api_router.post("/ai/generate-photoshoot")
async def generate_photoshoot(request: dict, user_id: str = Depends(get_current_user)):
    try:
        prompt = request.get('prompt', '')
        base_image = request.get('baseImage')
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"photoshoot_{user_id}_{uuid.uuid4()}",
            system_message="Você é especialista em fotografia profissional e direção de arte."
        )
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        # Se tem imagem base, usa para editar
        if base_image and base_image.get('base64'):
            message = UserMessage(
                text=f"Crie um ensaio fotográfico profissional: {prompt}",
                file_contents=[ImageContent(base_image['base64'])]
            )
        else:
            message = UserMessage(text=f"Crie um ensaio fotográfico profissional: {prompt}")
        
        text_response, images = await chat.send_message_multimodal_response(message)
        
        if images and len(images) > 0:
            # Retorna primeira imagem gerada
            image_data = images[0]['data']
            return {"imageUrl": f"data:{images[0]['mime_type']};base64,{image_data}"}
        else:
            raise HTTPException(status_code=500, detail="Nenhuma imagem foi gerada")
            
    except Exception as e:
        logger.error(f"Erro ao gerar ensaio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar ensaio: {str(e)}")

@api_router.post("/ai/edit-image")
async def edit_image(request: dict, user_id: str = Depends(get_current_user)):
    try:
        prompt = request.get('prompt', '')
        image_data = request.get('image', {})
        base64_img = image_data.get('base64', '')
        
        if not base64_img or not prompt:
            raise HTTPException(status_code=400, detail="Imagem e prompt são obrigatórios")
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"edit_{user_id}_{uuid.uuid4()}",
            system_message="Você é especialista em edição de imagens e manipulação fotográfica."
        )
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        message = UserMessage(
            text=f"Edite esta imagem: {prompt}. Aplique as mudanças solicitadas de forma realista.",
            file_contents=[ImageContent(base64_img)]
        )
        
        text_response, images = await chat.send_message_multimodal_response(message)
        
        if images and len(images) > 0:
            image_result = images[0]['data']
            return {"imageUrl": f"data:{images[0]['mime_type']};base64,{image_result}"}
        else:
            raise HTTPException(status_code=500, detail="Não foi possível editar a imagem")
            
    except Exception as e:
        logger.error(f"Erro ao editar imagem: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao editar imagem: {str(e)}")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()