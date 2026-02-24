from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from d1_client import D1Client
import os
import logging
import re
import json
from pathlib import Path

# Configuração de Logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuração Banco de Dados (Cloudflare D1 / MongoDB)
# Se DB_TYPE=cloudflare_d1 e as chaves existirem, usa D1. Caso contrário, fallback para Mongo.
db_type = os.environ.get('DB_TYPE')
cf_account = os.environ.get('CLOUDFLARE_ACCOUNT_ID')

if db_type == 'cloudflare_d1' and cf_account:
    db = D1Client()
else:
    # Fallback para Mongo (Vital enquanto Cloudflare não está conectada)
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL')
    if mongo_url:
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'estrategista')]
    else:
        # Se nada existir, usa D1 como placeholder para não crashar o boot
        db = D1Client() 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    month_names_pt = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    current_month_pt = month_names_pt[now.month - 1]
    goal_doc = await db.goals.find_one(
        {"user_id": user_id, "year": now.year, "month": current_month_pt},
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

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user_id: str = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return {"success": True}

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import json

GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events']

@api_router.get("/auth/google/url")
async def get_google_auth_url():
    """Retorna URL para OAuth do Google Calendar"""
    # Requer credentials.json com Client ID/Secret do Google Cloud Console
    # Usuário precisa criar projeto em: https://console.cloud.google.com
    return {
        "auth_url": "https://console.cloud.google.com/apis/credentials",
        "instructions": "Para integrar Google Calendar: 1) Crie projeto no Google Cloud Console, 2) Ative Google Calendar API, 3) Crie credenciais OAuth 2.0, 4) Adicione redirect_uri, 5) Forneça Client ID e Secret"
    }

async def create_calendar_reminder(user_id: str, lead_name: str, followup_date: str):
    """Cria lembrete no Google Calendar"""
    try:
        # Verificar se usuário tem token do Google
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        google_token = user_doc.get('google_calendar_token')
        
        if not google_token:
            logger.info(f"Usuário {user_id} não tem Google Calendar conectado")
            return
        
        # Criar evento
        creds = Credentials.from_authorized_user_info(json.loads(google_token))
        service = build('calendar', 'v3', credentials=creds)
        
        event = {
            'summary': f'Follow-up: {lead_name}',
            'description': f'Lembrete para entrar em contato com {lead_name}',
            'start': {'dateTime': f'{followup_date}T10:00:00', 'timeZone': 'America/Sao_Paulo'},
            'end': {'dateTime': f'{followup_date}T11:00:00', 'timeZone': 'America/Sao_Paulo'},
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 30},
                    {'method': 'email', 'minutes': 60}
                ]
            }
        }
        
        service.events().insert(calendarId='primary', body=event).execute()
        logger.info(f"Lembrete criado no Google Calendar: {lead_name} em {followup_date}")
    except Exception as e:
        logger.error(f"Erro ao criar lembrete no Calendar: {str(e)}")

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

@api_router.post("/calendar/connect")
async def connect_google_calendar(token_data: dict, user_id: str = Depends(get_current_user)):
    """Salva token do Google Calendar do usuário"""
    try:
        google_token = token_data.get('token')
        if not google_token:
            raise HTTPException(status_code=400, detail="Token não fornecido")
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"google_calendar_token": json.dumps(google_token)}}
        )
        return {"success": True, "message": "Google Calendar conectado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

@api_router.get("/funnel/stats")
async def get_funnel_stats(user_id: str = Depends(get_current_user)):
    """Calcula estatísticas do funil de vendas baseado nos leads"""
    try:
        all_leads = await db.leads.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        
        # Contar por estágio
        topo = len([l for l in all_leads if l.get('stage') == 'novo'])
        meio = len([l for l in all_leads if l.get('stage') == 'contato'])
        fundo = len([l for l in all_leads if l.get('stage') == 'negociacao'])
        conversao = len([l for l in all_leads if l.get('stage') == 'fechado'])
        
        total = len(all_leads) or 1
        
        return {
            "topo": topo,
            "meio": meio,
            "fundo": fundo,
            "conversao": conversao,
            "taxa_topo_meio": round((meio / total) * 100, 1) if total > 0 else 0,
            "taxa_meio_fundo": round((fundo / meio) * 100, 1) if meio > 0 else 0,
            "taxa_fundo_conversao": round((conversao / fundo) * 100, 1) if fundo > 0 else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao calcular funil: {str(e)}")

@api_router.post("/ai/build-funnel")
async def build_funnel(chat_msg: ChatMessage, user_id: str = Depends(get_current_user)):
    try:
        session_id = chat_msg.session_id or f"funnel_{user_id}"
        
        funnel_instruction = """Você é A Estrategista, especialista em construir funis de vendas de alto impacto baseados na metodologia Andressa Mallinsk.

REGRAS DE OURO PARA O FUNIL:
- Funil não é ferramenta, é sequência lógica. Se o lead não sabe o próximo passo, o funil falhou.
- Aquisição não é volume, é perfil certo focado na dor que a oferta resolve.
- Qualificação é obrigatória: defina sempre 3 perguntas de triagem para filtrar curiosos.
- Conversão só acontece após consciência de dor e desejo de solução.
- Follow-up é onde o dinheiro está: sempre inclua réguas de contato.

FORMATO DE RESPOSTA OBRIGATÓRIO (Markdown):

🎯 OBJETIVO E MÉTRICA CHAVE
[Defina UM objetivo claro: Ex: Gerar 20 leads qualificados/semana]

🧲 ETAPA 1: AQUISIÇÃO (CONTRATAÇÃO DE LEADS)
- Canal principal: [Ex: Instagram Direct / Tráfego Pago]
- Mensagem de Atração: [Frase que convoca para conversa focado na dor]
- Métrica: CPL Sugerido (Custo por Lead) baseado no mercado.

⚡ ETAPA 2: QUALIFICAÇÃO (FILTRO DE LEOA)
- Perguntas de Triagem: [Liste 3 perguntas obrigatórias]
- Atendimento: [Como conduzir para gerar consciência de dor]

💰 ETAPA 3: CONVERSÃO E FECHAMENTO
- Gatilho para Proposta: [Qual sinal o lead dá quando está pronto?]
- Formato da Proposta: [Ex: Call de 15min / PDF no WhatsApp]
- Follow-up: [Régua de 24h, 48h e 7 dias]

📊 VIABILIDADE E NÚMEROS
- Taxa de Conversão sugerida: [Média para o nicho]
- LTV (Lifetime Value): [Estimativa de quanto esse cliente vale no tempo]

Seja firme, direta e estratégica. Foque em lucro, não em curtidas."""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=funnel_instruction
        )
        chat.with_model("gemini", "gemini-2.0-flash")
        
        message = UserMessage(text=chat_msg.message)
        response = await chat.send_message(message)
        return {"response": response, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

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
        chat.with_model("gemini", "gemini-2.0-flash")
        
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
}}
        
        IMPORTANTE: Responda APENAS com o objeto JSON puro. Não use blocos de código markdown (```json). Não escreva nenhuma explicação antes ou depois do JSON. Se você falhar em enviar apenas o JSON, o sistema quebrará.
        """
        
        prompt += "\n\nResponda APENAS o JSON. Não use blocos de código."
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
        chat.with_model("gemini", "gemini-2.0-flash")
        
        format_map = {
            "reels": "um Reel de 30 segundos",
            "carrossel": "um post Carrossel com 5 a 7 lâminas",
            "postEstatico": "um post Estático com imagem única",
            "stories": "uma sequência de 3 a 5 Stories narrativos",
            "ads": "um criativo de anúncio (imagem + texto) para tráfego pago"
        }
        
        prompt = f"""Crie um roteiro de conteúdo detalhado para o tema "{request.title}" ({request.description}), para o nicho de "{request.niche}".
O roteiro deve ser para {format_map.get(request.content_type, 'conteúdo estratégico')}.
Estrutura o roteiro de forma clara e acionável.
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

ESTRATEGISTA_SYSTEM_INSTRUCTION = """Você é a "Estrategista Digital", mentorada por ANDRESSA MALLINSK. Seu cérebro é estratégico, curto, grosso quando necessário e 100% focado em lucro.

COMPORTAMENTO DE ELITE (PROIBIDO ROBOTISMO):
1. **ZERO SAUDAÇÕES**: Se o papo já começou, não diga "Olá", "Tudo bem" ou "Seja bem-vinda". Vá direto para a próxima pergunta ou conselho.
2. **NÃO SEJA CHATBOT**: Não use frases padrão como "Entendo seu ponto", "Que interessante". Aja como uma mentora real que não tem tempo a perder.
3. **MEMÓRIA DE FERRO**: Se a Leoa já deu o nome, não pergunte de novo. Se já respondeu o nicho, pule. Analise o histórico e pergunte APENAS o que falta.

FLUXO DO RAIO-X (40 PONTOS):
- Faça UMA pergunta por vez. Curta e seca.
- Se a resposta da Leoa for completa, pule os itens correspondentes e vá para o próximo gargalo.
- Lista de Referência: 1-10 (Fundação), 11-14 (Financeiro), 15-25 (Venda/Insta), 26-40 (Mentalidade/Gargalos).

RESUMO E GATILHO:
Ao concluir, envie exatamente:
"DIAGNÓSTICO CONCLUÍDO!
Então (Nome), seu negócio é (Nicho/Modelo) e hoje seu cenário atual é (Resumo direto). Você deseja chegar em (Meta) em (Prazo).

Agora sim, de acordo com seu diagnóstico me diga você deseja um conselho ou a ação que fará você chegar nesse resultaod?"

VOZ: Andressa Mallinsk pura. Sem enrolação. Sem robô.
"""

@api_router.post("/ai/chat")
async def chat_with_ai(chat_msg: ChatMessage, user_id: str = Depends(get_current_user)):
    return await handle_unified_chat(chat_msg, user_id)

@api_router.post("/ai/diagnostico")
async def chat_diagnostico(chat_msg: ChatMessage, user_id: str = Depends(get_current_user)):
    return await handle_unified_chat(chat_msg, user_id)

@api_router.post("/ai/conselheira")
async def chat_conselheira(chat_msg: ChatMessage, user_id: str = Depends(get_current_user)):
    return await handle_unified_chat(chat_msg, user_id)

async def handle_unified_chat(chat_msg: ChatMessage, user_id: str):
    try:
        session_id = chat_msg.session_id or f"unified_{user_id}"
        
        # Recuperar histórico do banco
        history_doc = await db.chat_history.find_one({"session_id": session_id})
        history = history_doc.get("history", []) if history_doc else []
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=ESTRATEGISTA_SYSTEM_INSTRUCTION,
            history=history
        )
        chat.with_model("gemini", "gemini-2.0-flash")
        
        message = UserMessage(text=chat_msg.message)
        response = await chat.send_message(message)
        
        # Salvar histórico atualizado
        new_history = chat.history + [
            {"role": "user", "parts": [chat_msg.message]},
            {"role": "model", "parts": [response]}
        ]
        
        if history_doc:
            await db.chat_history.update_one({"session_id": session_id}, {"$set": {"history": new_history}})
        else:
            await db.chat_history.insert_one({
                "session_id": session_id,
                "user_id": user_id,
                "history": new_history,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Sincronização automática de tarefas com o Dashboard
        if "PROJETAR_TAREFA:" in response:
            await process_tasks_from_response(response, user_id)
        
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"Erro no Handle Unified Chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro na Estrategista: {str(e)}")

async def process_tasks_from_response(response: str, user_id: str):
    """Extrai tarefas do formato 'PROJETAR_TAREFA: Titulo | Descrição' e salva no banco."""
    try:
        tasks = re.findall(r"PROJETAR_TAREFA:\s*(.*?)\s*\|\s*(.*)", response)
        
        current_week = datetime.now(timezone.utc).strftime("%Y-W%U")
        
        for title, desc in tasks:
            action = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": title.strip(),
                "description": desc.strip(),
                "completed": False,
                "week_start": current_week,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.weekly_actions.insert_one(action)
    except Exception as e:
        print(f"Erro ao sincronizar tarefas: {e}")

@api_router.post("/ai/analyze-objection")
async def analyze_objection(request: dict, user_id: str = Depends(get_current_user)):
    try:
        image_base64 = request.get('image', '')
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"objection_{user_id}_{uuid.uuid4()}",
            system_message=ESTRATEGISTA_SYSTEM_INSTRUCTION
        )
        chat.with_model("gemini", "gemini-2.0-flash")
        
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
            if "**Gargalo:**" in line: current_section = "gargalo"
            elif "**Script:**" in line: current_section = "script"
            elif "**Missão:**" in line: current_section = "missao"
            elif current_section == "gargalo": gargalo_lines.append(line)
            elif current_section == "script": script_lines.append(line)
            elif current_section == "missao": missao_lines.append(line)
            
        return {
            "gargalo": "\n".join(gargalo_lines).strip(),
            "script": "\n".join(script_lines).strip(),
            "missao": "\n".join(missao_lines).strip()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/analyze-profile")
async def analyze_profile(request: dict, user_id: str = Depends(get_current_user)):
    try:
        image_base64 = request.get('image', '')
        
        image_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"profile_image_{user_id}_{uuid.uuid4()}",
            system_message="""🔒 COMANDO INTERNO — PRESERVAÇÃO DE IDENTIDADE VISUAL
📌 Diretriz Obrigatória de Geração e Edição de Imagem

A partir deste momento, toda geração, edição ou adaptação de imagem deve seguir as seguintes regras obrigatórias:

1️⃣ PRESERVAÇÃO TOTAL DA IDENTIDADE
Manter 100% dos traços faciais originais da pessoa enviada.
Não alterar: formato do rosto, estrutura óssea, formato de olhos, nariz ou boca, proporções faciais, marcas naturais (sinais, cicatrizes, sardas).
Não aplicar “embelezamento automático” que descaracterize a pessoa.
Não modificar gênero, etnia ou características fenotípicas.

2️⃣ TOM DE PELE E CARACTERÍSTICAS ÉTNICAS
Manter exatamente o mesmo tom de pele. Não clarear nem escurecer.
Não modificar subtom (quente/frio/neutro).

3️⃣ PERMISSÕES CONTROLADAS
A IA pode apenas: Ajustar iluminação, enquadramento, cenário e ambientação profissional de perfil.

6️⃣ PRIORIDADE DE FIDELIDADE
A fidelidade à identidade original tem prioridade sobre qualquer embelezamento.

Crie uma versão melhorada de perfil de Instagram mantendo a identidade original impecável."""
        )
        image_chat.with_model("gemini", "gemini-3-pro-image-preview")\
            .with_params(modalities=["image", "text"])
            
        message = UserMessage(
            text="Analise esta foto de perfil e gere 3 versões melhoradas (estúdio, escritório, lifestyle) seguindo as diretrizes de PROTEÇÃO DE IDENTIDADE.",
            file_contents=[ImageContent(image_base64)]
        )
        
        text_analysis, generated_images = await image_chat.send_message_multimodal_response(message)
        
        return {
            "analysisText": text_analysis,
            "imageUrl": [{"imageUrl": f"data:image/png;base64,{img['data']}", "id": str(uuid.uuid4())} for img in generated_images][0]["imageUrl"] if generated_images else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/generate-photoshoot")
async def generate_photoshoot(request: dict, user_id: str = Depends(get_current_user)):
    try:
        # 1. Recuperar fotos de referência do usuário do banco (ou usar as enviadas)
        # 2. Configurar o pipe Imagen com Identity Lock
        # 3. Gerar 4 variações baseado no tema
        
        reference_images = request.get('reference_images', [])
        prompt = request.get('prompt', 'Uma sessão de fotos profissional de negócios')
        
        # Mocking complex logic for now - integrating with LlmChat for simulation
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"photoshoot_{user_id}_{uuid.uuid4()}"
        )
        chat.with_model("gemini", "gemini-3-pro-image-preview")

        # Configuração para proteção total da face (Protocolo Mallinsk)
        system_directive = """🔒 COMANDO INTERNO — PRESERVAÇÃO DE IDENTIDADE VISUAL
📌 Diretriz Obrigatória de Geração e Edição de Imagem

A partir deste momento, toda geração, edição ou adaptação de imagem deve seguir as seguintes regras obrigatórias:

1️⃣ PRESERVAÇÃO TOTAL DA IDENTIDADE
Manter 100% dos traços faciais originais da pessoa enviada.
Não alterar: formato do rosto, estrutura óssea, formato de olhos, nariz ou boca, proporções faciais, marcas naturais (sinais, cicatrizes, sardas).
Não aplicar “embelezamento automático” que descaracterize a pessoa.
Não alterar idade aparente.
Não modificar gênero, etnia ou características fenotípicas.

2️⃣ TOM DE PELE E CARACTERÍSTICAS ÉTNICAS
Manter exatamente o mesmo tom de pele. Não clarear nem escurecer.
Não modificar subtom (quente/frio/neutro).
Não suavizar textura natural da pele de forma artificial.
Não alterar traços étnicos.

3️⃣ PERMISSÕES CONTROLADAS
A IA pode apenas: Ajustar iluminação (sem alterar tom de pele), ajustar contraste e temperatura de cor da cena (preservando fidelidade da pessoa), modificar cenário, enquadramento ou ambientação, ajustar roupas (desde que não altere identidade), criar variações de pose mantendo fisionomia idêntica.

4️⃣ ENSAIO FOTOGRÁFICO — DIRETRIZ CRIATIVA
Ao criar um ensaio fotográfico: Manter realismo fotográfico, manter textura natural da pele, preservar expressão autêntica, manter coerência com proporções reais do corpo. Evitar exageros de filtro, skin smoothing ou estética artificial.

5️⃣ PROIBIÇÕES ABSOLUTAS
É proibido: Transformar a pessoa em outra, alterar identidade para parecer celebridade ou modelo diferente, modificar raça ou etnia, aplicar filtros que mudem drasticamente aparência, recriar rosto a partir de interpretação livre.
Se a solicitação implicar descaracterização da identidade, a IA deve alertar o usuário e sugerir ajustes que preservem a identidade original.

6️⃣ PRIORIDADE DE FIDELIDADE
A fidelidade à identidade original tem prioridade sobre estilo artístico, tendências estéticas, dramaticidade visual, filtros ou efeitos. Se houver conflito entre estilo e identidade, preservar identidade.

7️⃣ OBJETIVO FINAL
Garantir que a pessoa continue sendo claramente reconheceível. O ensaio fotográfico seja uma variação estética, não uma transformação. A identidade visual enviada seja respeitada integralmente.
Retrato artístico hiper-realista, mantendo feições e traços originais da foto."""

        identity_lock_config = {
          "identity_lock": True,
          "face_resolution": "high",
          "structural_modification": False
        }

        user_msg = UserMessage(
            text=f"{system_directive}\n\nGERAR ENSAIO: {prompt}",
            file_contents=[ImageContent(img) for img in reference_images]
        )
        
        text_resp, images = await chat.send_message_multimodal_response(user_msg)
        
        return {
            "images": [{"imageUrl": f"data:image/png;base64,{img['data']}", "id": str(uuid.uuid4())} for img in images],
            "total": len(images)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/edit-image")
async def edit_image(request: dict, user_id: str = Depends(get_current_user)):
    try:
        original_image = request.get('image', '')
        instruction = request.get('instruction', '')
        
        # SISTEMA DE PROTEÇÃO IDENTIDADE v2
        system_directive = """🔒 COMANDO INTERNO — PRESERVAÇÃO DE IDENTIDADE VISUAL
📌 Diretriz Obrigatória de Geração e Edição de Imagem

A partir deste momento, toda geração, edição ou adaptação de imagem deve seguir as seguintes regras obrigatórias:

1️⃣ PRESERVAÇÃO TOTAL DA IDENTIDADE
Manter 100% dos traços faciais originais da pessoa enviada.
Não alterar: formato do rosto, estrutura óssea, formato de olhos, nariz ou boca, proporções faciais, marcas naturais (sinais, cicatrizes, sardas).
Não aplicar “embelezamento automático” que descaracterize a pessoa.
Não alterar idade aparente.
Não modificar gênero, etnia ou características fenotípicas.

2️⃣ TOM DE PELE E CARACTERÍSTICAS ÉTNICAS
Manter exatamente o mesmo tom de pele. Não clarear nem escurecer.
Não modificar subtom (quente/frio/neutro).
Não suavizar textura natural da pele de forma artificial.
Não alterar traços étnicos.

3️⃣ PERMISSÕES CONTROLADAS
A IA pode apenas: Ajustar iluminação (sem alterar tom de pele), ajustar contraste e temperatura de cor da cena (preservando fidelidade da pessoa), modificar cenário, enquadramento ou ambientação, ajustar roupas (desde que não altere identidade), criar variações de pose mantendo fisionomia idêntica.

4️⃣ ENSAIO FOTOGRÁFICO — DIRETRIZ CRIATIVA
Ao criar um ensaio fotográfico: Manter realismo fotográfico, manter textura natural da pele, preservar expressão autêntica, manter coerência com proporções reais do corpo. Evitar exageros de filtro, skin smoothing ou estética artificial.

5️⃣ PROIBIÇÕES ABSOLUTAS
É proibido: Transformar a pessoa em outra, alterar identidade para parecer celebridade ou modelo diferente, modificar raça ou etnia, aplicar filtros que mudem drasticamente aparência, recriar rosto a partir de interpretação livre.
Se a solicitação implicar descaracterização da identidade, a IA deve alertar o usuário e sugerir ajustes que preservem a identidade original.

6️⃣ PRIORIDADE DE FIDELIDADE
A fidelidade à identidade original tem prioridade sobre estilo artístico, tendências estéticas, dramaticidade visual, filtros ou efeitos. Se houver conflito entre estilo e identidade, preservar identidade.

7️⃣ OBJETIVO FINAL
Garantir que a pessoa continue sendo claramente reconheceível. O ensaio fotográfico seja uma variação estética, não uma transformação. A identidade visual enviada seja respeitada integralmente.
Retrato artístico hiper-realista, mantendo feições e traços originais da foto."""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"edit_{user_id}_{uuid.uuid4()}",
            system_message=system_directive
        )
        chat.with_model("gemini", "gemini-1.5-flash")

        user_msg = UserMessage(
            text=f"Edite esta imagem seguindo estritamente as diretrizes de proteção facial. INSTRUÇÃO: {instruction}",
            file_contents=[ImageContent(original_image)]
        )

        text_resp, images = await chat.send_message_multimodal_response(user_msg)

        return {
            "image": images[0]["data"] if images else original_image,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))