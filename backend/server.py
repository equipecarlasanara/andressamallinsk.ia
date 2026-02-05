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
from emergentintegrations.llm.chat import LlmChat, UserMessage

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

@api_router.post("/ai/chat")
async def chat_with_ai(chat_msg: ChatMessage, user_id: str = Depends(get_current_user)):
    try:
        session_id = chat_msg.session_id or f"chat_{user_id}"
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="Você é a Estrategista Digital, uma mentora de negócios baseada na metodologia de Andressa Mallinsk. Você ajuda empreendedoras a estruturar e escalar seus negócios com foco em resultados financeiros. Seja direta, prática e estratégica."
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
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"objection_{user_id}_{uuid.uuid4()}",
            system_message="Você é uma especialista em vendas que analisa objeções e cria scripts de conversão."
        )
        chat.with_model("gemini", "gemini-3-flash-preview")
        
        prompt = """Analise esta conversa com uma objeção de vendas e forneça:

---
**Gargalo:**
[Identifique o principal gargalo ou objeção do prospect]

---
**Script:**
[Forneça um script exato, palavra por palavra, para responder e reverter a objeção]

---
**Missão:**
[Dê instruções claras sobre como a pessoa deve agir após enviar este script]"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        return {"analysis": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao analisar objeção: {str(e)}")

@api_router.post("/ai/analyze-profile")
async def analyze_profile(request: dict, user_id: str = Depends(get_current_user)):
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"profile_{user_id}_{uuid.uuid4()}",
            system_message="Você é uma especialista em marketing digital e posicionamento de marca no Instagram."
        )
        chat.with_model("gemini", "gemini-3-flash-preview")
        
        prompt = """Analise este perfil do Instagram e forneça:
1. Lista de pontos que precisam ser ajustados
2. Sugestões específicas de melhoria
3. Recomendações estratégicas

Seja direta e prática. Liste os pontos numerados."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        return {"analysisText": response, "imageUrl": f"data:image/jpeg;base64,{request.get('image')}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao analisar perfil: {str(e)}")

@api_router.post("/ai/generate-photoshoot")
async def generate_photoshoot(request: dict, user_id: str = Depends(get_current_user)):
    try:
        # Por enquanto retorna um placeholder, pois geração de imagem requer setup específico
        # Este endpoint pode ser implementado com Gemini Nano Banana ou outro serviço
        return {"imageUrl": "https://via.placeholder.com/1024x1024?text=Ensaio+Fotográfico+Gerado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar ensaio: {str(e)}")

@api_router.post("/ai/edit-image")
async def edit_image(request: dict, user_id: str = Depends(get_current_user)):
    try:
        # Placeholder para edição de imagem com Nano Banana
        # Retorna a imagem original como demonstração
        image_data = request.get('image', {})
        base64_img = image_data.get('base64', '')
        return {"imageUrl": f"data:image/jpeg;base64,{base64_img}"}
    except Exception as e:
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