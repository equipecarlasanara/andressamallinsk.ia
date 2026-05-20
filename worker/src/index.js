// ============================================================
// A ESTRATEGISTA — Cloudflare Worker (Backend completo em JS)
// Substitui o backend Python/FastAPI para rodar 100% na Cloudflare
// ============================================================

// ---------- UTILITÁRIOS ----------

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function error(message, status = 400) {
  return json({ detail: message }, status);
}

// ---------- JWT ----------

async function signJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${data}.${sigB64}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split(".");
    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- BCRYPT (via Web Crypto — PBKDF2) ----------
// Cloudflare Workers não tem bcrypt nativo, usamos PBKDF2 que é seguro

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(":");
  const salt = Uint8Array.from(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  const newHash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return newHash === hashHex;
}

// ---------- AUTH MIDDLEWARE ----------

async function authenticate(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  return payload?.user_id || null;
}

// ---------- GEMINI AI ----------

async function callGemini(apiKey, model, systemMessage, history, userText, imageBase64 = null) {
  if (model.includes("image-generation") || model.startsWith("imagen-")) {
    const prompt = userText;
    const body = {
      instances: [
        { prompt }
      ],
      parameters: {
        sampleCount: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "1:1"
      }
    };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Imagen API error");
    const imgBytes = data.predictions?.[0]?.bytesBase64Encoded;
    if (!imgBytes) throw new Error("Sem resposta da IA de imagem");
    return { text: "", images: [{ mimeType: "image/jpeg", data: imgBytes }] };
  }

  const contents = [];

  // Adicionar histórico
  for (const h of history) {
    contents.push({
      role: h.role === "model" ? "model" : "user",
      parts: Array.isArray(h.parts) ? h.parts.map(p => ({ text: p })) : [{ text: h.parts }]
    });
  }

  // Mensagem atual
  const parts = [{ text: userText }];
  if (imageBase64) {
    let mimeType = "image/jpeg";
    let imgData = imageBase64;
    if (imageBase64.includes(",")) {
      const match = imageBase64.match(/data:(.*?);base64,/);
      if (match) mimeType = match[1];
      imgData = imageBase64.split(",")[1];
    }
    parts.push({ inlineData: { mimeType, data: imgData } });
  }
  contents.push({ role: "user", parts });

  const body = {
    contents,
    systemInstruction: systemMessage ? { parts: [{ text: systemMessage }] } : undefined,
    generationConfig: { temperature: 0.7 }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API error");

  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error("Sem resposta da IA");

  let text = "";
  const images = [];

  for (const part of candidate.content?.parts || []) {
    if (part.text) text += part.text;
    if (part.inlineData) images.push({ mimeType: part.inlineData.mimeType, data: part.inlineData.data });
  }

  return { text, images };
}

// ---------- SYSTEM PROMPTS ----------

const ESTRATEGISTA_SYSTEM = `Você é a "Estrategista Digital", mentorada por ANDRESSA MALLINSK. Seu cérebro é estratégico, curto, grosso quando necessário e 100% focado em lucro. Você não é um chatbot, você é uma OPERADORA DE MARGEM.

COMPORTAMENTO DE ELITE (OBRIGATÓRIO):
1. ZERO SAUDAÇÕES: Se o papo já começou, não diga "Olá", "Tudo bem" ou "Seja bem-vinda". Vá direto.
2. UMA PERGUNTA POR VEZ: Nunca faça duas perguntas no mesmo bloco.
3. NÃO SEJA CHATBOT: Não use frases padrão. Aja como uma mentora real.
4. FOCO EM LUCRO: Se a resposta indicar prejuízo, alerte imediatamente.

PROTOCOLO DE DIAGNÓSTICO (RAIO-X DE 40 PONTOS):
BLOCO 1 — RAIO-X FINANCEIRO (Faturamento, Lucro, Ticket médio, Metas).
Regra: Se não souber o lucro, dê um alerta vermelho. Se lucro < 30%, aponte fragilidade.

BLOCO 2 — ESTRUTURA E DEPENDÊNCIA (Modelo de negócio, dependência da fundadora, equipe).
Regra: Se parar e o faturamento zera, avise: "Você tem um emprego caro, não um negócio".

BLOCO 3 — AQUISIÇÃO (Canais, leads por semana, audiência, tráfego pago).
Regra: Leads < 30/semana = Gargalo de Aquisição.

BLOCO 4 — CONVERSÃO E OFERTA (Processo de venda, taxa de conversão, promessa, high ticket).
Regra: Conversão < 10% = Problema de mensagem ou oferta.

BLOCO 5 — POSICIONAMENTO E ESCALABILIDADE.
Regra: Sem ativo proprietário = Você é commodity.

BLOCO 6 — GARGALO E FOCO.

CLASSIFICAÇÃO E CONCLUSÃO:
- Estágio 1 — Instável
- Estágio 2 — Operação manual
- Estágio 3 — Máquina validada
- Estágio 4 — Pronta para escalar

VOZ: Andressa Mallinsk pura. Direta. Estratégica. Sem robô.`;

const IMAGE_PROTECTION_SYSTEM = `🔒 COMANDO INTERNO — PRESERVAÇÃO DE IDENTIDADE VISUAL

1️⃣ PRESERVAÇÃO TOTAL DA IDENTIDADE
Manter 100% dos traços faciais originais da pessoa enviada.
Não alterar: formato do rosto, estrutura óssea, olhos, nariz, boca, proporções faciais, marcas naturais.
Não aplicar "embelezamento automático" que descaracterize a pessoa.
Não modificar gênero, etnia ou características fenotípicas.

2️⃣ TOM DE PELE: Manter exatamente o mesmo. Não clarear nem escurecer.

3️⃣ PERMISSÕES: Apenas iluminação, enquadramento, cenário e ambientação.

5️⃣ PROIBIÇÕES: Transformar em outra pessoa, alterar raça/etnia, aplicar filtros drásticos.

6️⃣ PRIORIDADE: Fidelidade à identidade original acima de qualquer estilo.`;

// ---------- D1 HELPERS ----------

async function dbQuery(env, sql, params = []) {
  const stmt = env.DB.prepare(sql);
  const result = params.length ? await stmt.bind(...params).all() : await stmt.all();
  return result.results || [];
}

async function dbRun(env, sql, params = []) {
  const stmt = env.DB.prepare(sql);
  return params.length ? await stmt.bind(...params).run() : await stmt.run();
}

// ---------- MESES EM PT ----------

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ============================================================
// ROTAS
// ============================================================

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "");
  const method = request.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }
    });
  }

  // Health check
  if (path === "/" && method === "GET") {
    return json({ message: "Estrategista API — Cloudflare Worker ✅" });
  }

  // ---- AUTH ----

  if (path === "/auth/register" && method === "POST") {
    const body = await request.json();
    const { email, name, password } = body;
    if (!email || !name || !password) return error("Campos obrigatórios faltando");

    const existing = await dbQuery(env, "SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) return error("Email já cadastrado");

    const id = uuid();
    const hashed = await hashPassword(password);
    const createdAt = now();

    await dbRun(env,
      "INSERT INTO users (id, email, name, password, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, email, name, hashed, createdAt]
    );

    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    const token = await signJWT({ user_id: id, exp }, env.JWT_SECRET);
    return json({ access_token: token, token_type: "bearer", user: { id, email, name, created_at: createdAt } });
  }

  if (path === "/auth/login" && method === "POST") {
    const body = await request.json();
    const { email, password } = body;

    const [user] = await dbQuery(env, "SELECT * FROM users WHERE email = ?", [email]);
    if (!user) return error("Credenciais inválidas", 401);

    const valid = await verifyPassword(password, user.password);
    if (!valid) return error("Credenciais inválidas", 401);

    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    const token = await signJWT({ user_id: user.id, exp }, env.JWT_SECRET);
    const { password: _, ...safeUser } = user;
    return json({ access_token: token, token_type: "bearer", user: safeUser });
  }

  if (path === "/auth/me" && method === "GET") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);

    const [user] = await dbQuery(env, "SELECT id, email, name, created_at FROM users WHERE id = ?", [userId]);
    if (!user) return error("Usuário não encontrado", 404);
    return json(user);
  }

  // ---- GOALS ----

  if (path === "/goals" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const body = await request.json();
    const { monthly_target, current_revenue = 0, month, year } = body;
    const id = uuid(); const ts = now();
    await dbRun(env,
      "INSERT INTO goals (id, user_id, monthly_target, current_revenue, month, year, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, userId, monthly_target, current_revenue, month, year, ts, ts]
    );
    return json({ id, user_id: userId, monthly_target, current_revenue, month, year, created_at: ts, updated_at: ts });
  }

  if (path === "/goals/current" && method === "GET") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const d = new Date();
    const monthPt = MONTHS_PT[d.getMonth()];
    const [goal] = await dbQuery(env,
      "SELECT * FROM goals WHERE user_id = ? AND month = ? AND year = ?",
      [userId, monthPt, d.getFullYear()]
    );
    return json(goal || null);
  }

  if (path === "/goals" && method === "GET") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const goals = await dbQuery(env, "SELECT * FROM goals WHERE user_id = ? LIMIT 100", [userId]);
    return json(goals);
  }

  const goalMatch = path.match(/^\/goals\/(.+)$/);
  if (goalMatch && method === "PATCH") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const goalId = goalMatch[1];
    const body = await request.json();
    const updates = [];
    const params = [];
    if (body.monthly_target !== undefined) { updates.push("monthly_target = ?"); params.push(body.monthly_target); }
    if (body.current_revenue !== undefined) { updates.push("current_revenue = ?"); params.push(body.current_revenue); }
    updates.push("updated_at = ?"); params.push(now());
    params.push(goalId, userId);
    await dbRun(env, `UPDATE goals SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`, params);
    const [goal] = await dbQuery(env, "SELECT * FROM goals WHERE id = ?", [goalId]);
    return json(goal);
  }

  // ---- WEEKLY ACTIONS ----

  if (path === "/weekly-actions" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const body = await request.json();
    const { title, description = null, week_start } = body;
    const id = uuid(); const ts = now();
    await dbRun(env,
      "INSERT INTO weekly_actions (id, user_id, title, description, completed, week_start, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)",
      [id, userId, title, description, week_start, ts, ts]
    );
    return json({ id, user_id: userId, title, description, completed: false, week_start, created_at: ts, updated_at: ts });
  }

  if (path === "/weekly-actions" && method === "GET") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const weekStart = url.searchParams.get("week_start");
    let actions;
    if (weekStart) {
      actions = await dbQuery(env, "SELECT * FROM weekly_actions WHERE user_id = ? AND week_start = ? LIMIT 100", [userId, weekStart]);
    } else {
      actions = await dbQuery(env, "SELECT * FROM weekly_actions WHERE user_id = ? LIMIT 100", [userId]);
    }
    return json(actions);
  }

  const actionMatch = path.match(/^\/weekly-actions\/(.+)$/);
  if (actionMatch && method === "PATCH") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const actionId = actionMatch[1];
    const body = await request.json();
    const updates = [];
    const params = [];
    if (body.title !== undefined) { updates.push("title = ?"); params.push(body.title); }
    if (body.description !== undefined) { updates.push("description = ?"); params.push(body.description); }
    if (body.completed !== undefined) { updates.push("completed = ?"); params.push(body.completed ? 1 : 0); }
    updates.push("updated_at = ?"); params.push(now());
    params.push(actionId, userId);
    await dbRun(env, `UPDATE weekly_actions SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`, params);
    const [action] = await dbQuery(env, "SELECT * FROM weekly_actions WHERE id = ?", [actionId]);
    return json({ ...action, completed: Boolean(action.completed) });
  }

  if (actionMatch && method === "DELETE") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const actionId = actionMatch[1];
    await dbRun(env, "DELETE FROM weekly_actions WHERE id = ? AND user_id = ?", [actionId, userId]);
    return json({ success: true });
  }

  // ---- LEADS ----

  if (path === "/leads" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const body = await request.json();
    const { name, phone, stage = "novo", notes = null, followup_date = null } = body;
    const id = uuid(); const ts = now();
    await dbRun(env,
      "INSERT INTO leads (id, user_id, name, phone, stage, notes, followup_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, userId, name, phone, stage, notes, followup_date, ts, ts]
    );
    return json({ id, user_id: userId, name, phone, stage, notes, followup_date, created_at: ts, updated_at: ts });
  }

  if (path === "/leads" && method === "GET") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const leads = await dbQuery(env, "SELECT * FROM leads WHERE user_id = ? LIMIT 100", [userId]);
    return json(leads);
  }

  const leadMatch = path.match(/^\/leads\/(.+)$/);
  if (leadMatch && method === "PATCH") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const leadId = leadMatch[1];
    const body = await request.json();
    const updates = [];
    const params = [];
    const fields = ["name", "phone", "stage", "notes", "followup_date"];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    updates.push("updated_at = ?"); params.push(now());
    params.push(leadId, userId);
    await dbRun(env, `UPDATE leads SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`, params);
    const [lead] = await dbQuery(env, "SELECT * FROM leads WHERE id = ?", [leadId]);
    return json(lead);
  }

  if (leadMatch && method === "DELETE") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const leadId = leadMatch[1];
    await dbRun(env, "DELETE FROM leads WHERE id = ? AND user_id = ?", [leadId, userId]);
    return json({ success: true });
  }

  // ---- FUNNEL STATS ----

  if (path === "/funnel/stats" && method === "GET") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const leads = await dbQuery(env, "SELECT stage FROM leads WHERE user_id = ?", [userId]);
    const topo = leads.filter(l => l.stage === "novo").length;
    const meio = leads.filter(l => l.stage === "contato").length;
    const fundo = leads.filter(l => l.stage === "negociacao").length;
    const conversao = leads.filter(l => l.stage === "fechado").length;
    const total = leads.length || 1;
    return json({
      topo, meio, fundo, conversao,
      taxa_topo_meio: meio > 0 ? Math.round((meio / total) * 100 * 10) / 10 : 0,
      taxa_meio_fundo: meio > 0 ? Math.round((fundo / meio) * 100 * 10) / 10 : 0,
      taxa_fundo_conversao: fundo > 0 ? Math.round((conversao / fundo) * 100 * 10) / 10 : 0,
    });
  }

  // ---- CONTENT ----

  if (path === "/content" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const body = await request.json();
    const { title, content_type, theme, description, generated_content = null } = body;
    const id = uuid(); const ts = now();
    await dbRun(env,
      "INSERT INTO content_items (id, user_id, title, content_type, theme, description, generated_content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, userId, title, content_type, theme, description, generated_content, ts]
    );
    return json({ id, user_id: userId, title, content_type, theme, description, generated_content, created_at: ts });
  }

  if (path === "/content" && method === "GET") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const items = await dbQuery(env, "SELECT * FROM content_items WHERE user_id = ? LIMIT 100", [userId]);
    return json(items);
  }

  // ---- CALENDAR (placeholder) ----

  if (path === "/auth/google/url" && method === "GET") {
    return json({ auth_url: "https://console.cloud.google.com/apis/credentials", instructions: "Google Calendar não configurado." });
  }

  if (path === "/calendar/sync" && method === "POST") {
    return json({ success: true, synced: 0, message: "Google Calendar não configurado nesta versão." });
  }

  if (path === "/calendar/connect" && method === "POST") {
    return json({ success: false, message: "Integração Google Calendar não disponível nesta versão." });
  }


  // ---- PLANO DE AÇÃO INDIVIDUAL ----

  if (path === "/action-plan" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const body = await request.json();
      const { filename, content: planBase64, is_pdf } = body;
      if (!planBase64) return error("Conteúdo do plano é obrigatório");

      let extractedText = planBase64;

      // Se for PDF, usar Gemini para extrair o texto
      if (is_pdf) {
        const geminiBody = {
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data: planBase64 } },
              { text: "Extraia TODO o conteúdo textual deste PDF de plano de ação. Mantenha a estrutura, títulos, listas e informações exatamente como estão. Não resuma — transcreva tudo." }
            ]
          }]
        };
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiBody) }
        );
        const geminiData = await geminiRes.json();
        extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Conteúdo não pôde ser extraído";
      }

      const id = uuid();
      const ts = now();

      // Apaga plano anterior e insere novo
      await dbRun(env, "DELETE FROM action_plans WHERE user_id = ?", [userId]);
      await dbRun(env,
        "INSERT INTO action_plans (id, user_id, filename, content, uploaded_at) VALUES (?, ?, ?, ?, ?)",
        [id, userId, filename || "plano.pdf", extractedText, ts]
      );

      return json({ success: true, id, uploaded_at: ts, message: "Plano de ação salvo com sucesso!" });
    } catch (e) {
      return error(`Erro ao salvar plano: ${e.message}`, 500);
    }
  }

  if (path === "/action-plan" && method === "GET") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    const [plan] = await dbQuery(env, "SELECT id, user_id, filename, uploaded_at FROM action_plans WHERE user_id = ?", [userId]);
    return json(plan || null);
  }

  if (path === "/action-plan" && method === "DELETE") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    await dbRun(env, "DELETE FROM action_plans WHERE user_id = ?", [userId]);
    return json({ success: true });
  }

  // ---- AI ROUTES ----

  if (path === "/ai/build-funnel" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const body = await request.json();
      const sessionId = body.session_id || `funnel_${userId}`;
      const funnelSystem = `Você é A Estrategista, especialista em construir funis de vendas de alto impacto baseados na metodologia Andressa Mallinsk.

REGRAS DE OURO:
- Funil não é ferramenta, é sequência lógica.
- Aquisição não é volume, é perfil certo.
- Qualificação é obrigatória: 3 perguntas de triagem.
- Conversão só acontece após consciência de dor.
- Follow-up é onde o dinheiro está.

FORMATO OBRIGATÓRIO (Markdown):
🎯 OBJETIVO E MÉTRICA CHAVE
🧲 ETAPA 1: AQUISIÇÃO
⚡ ETAPA 2: QUALIFICAÇÃO
💰 ETAPA 3: CONVERSÃO E FECHAMENTO
📊 VIABILIDADE E NÚMEROS`;

      const { text } = await callGemini(env.GEMINI_API_KEY, "gemini-2.0-flash", funnelSystem, [], body.message);
      return json({ response: text, session_id: sessionId });
    } catch (e) {
      return error(`Erro: ${e.message}`, 500);
    }
  }

  if (path === "/ai/generate-themes" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const body = await request.json();
      // Carregar plano de ação para personalizar temas
      const [planDoc] = await dbQuery(env, "SELECT content FROM action_plans WHERE user_id = ?", [userId]);
      const planContext = planDoc
        ? `\n\nCONTEXTO DO PLANO DE AÇÃO DA MENTORADA:\n${planDoc.content.slice(0, 2000)}\n\nGere os temas alinhados com o posicionamento, nicho e objetivos descritos neste plano.`
        : "";

      const prompt = `Para o nicho de "${body.niche}", gere uma lista de pelo menos 50 temas de conteúdo estratégicos.${planContext}
Responda APENAS com JSON puro (sem markdown, sem explicações):
{"reels":[{"title":"...","description":"..."}],"carrossel":[...],"postEstatico":[...],"stories":[...],"ads":[...]}
Cada chave deve ter pelo menos 10 objetos. Siga a metodologia Andressa Mallinsk.`;

      const { text } = await callGemini(env.GEMINI_API_KEY, "gemini-2.0-flash", "Você é uma estrategista de conteúdo da Andressa Mallinsk. Use o plano de ação da mentorada para personalizar os temas.", [], prompt);
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Formato inválido");
      return json(JSON.parse(match[0]));
    } catch (e) {
      return error(`Erro ao gerar temas: ${e.message}`, 500);
    }
  }

  if (path === "/ai/generate-content" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const body = await request.json();
      const formatMap = {
        reels: "um Reel de 30 segundos",
        carrossel: "um post Carrossel com 5 a 7 lâminas",
        postEstatico: "um post Estático com imagem única",
        stories: "uma sequência de 3 a 5 Stories narrativos",
        ads: "um criativo de anúncio para tráfego pago"
      };
      const prompt = `Crie um roteiro detalhado para o tema "${body.title}" (${body.description}), nicho "${body.niche}".
Formato: ${formatMap[body.content_type] || "conteúdo estratégico"}.
Finalize com CTA direto para DM. Voz firme e direta da Estrategista.`;

      const { text } = await callGemini(env.GEMINI_API_KEY, "gemini-2.0-flash", "Você é uma estrategista de conteúdo.", [], prompt);
      return json({ content: text });
    } catch (e) {
      return error(`Erro: ${e.message}`, 500);
    }
  }

  // Chat unificado (diagnostico, conselheira, chat)
  const chatPaths = ["/ai/chat", "/ai/diagnostico", "/ai/conselheira"];

  if (chatPaths.includes(path) && method === "GET") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const sessionType = path.split("/").pop(); // "chat", "diagnostico", "conselheira"
      const sessionId = `${sessionType}_${userId}`;
      const [histDoc] = await dbQuery(env, "SELECT history FROM chat_history WHERE session_id = ?", [sessionId]);
      const history = histDoc ? JSON.parse(histDoc.history) : [];
      return json(history);
    } catch (e) {
      return error(`Erro ao recuperar histórico: ${e.message}`, 500);
    }
  }

  if (chatPaths.includes(path) && method === "DELETE") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const sessionType = path.split("/").pop();
      const sessionId = `${sessionType}_${userId}`;
      await dbRun(env, "DELETE FROM chat_history WHERE session_id = ?", [sessionId]);
      return json({ success: true });
    } catch (e) {
      return error(`Erro ao reiniciar conversa: ${e.message}`, 500);
    }
  }

  if (chatPaths.includes(path) && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const body = await request.json();
      const sessionType = path.split("/").pop(); // "chat", "diagnostico", "conselheira"
      const sessionId = `${sessionType}_${userId}`;

      // Recuperar histórico
      const [histDoc] = await dbQuery(env, "SELECT history FROM chat_history WHERE session_id = ?", [sessionId]);
      const history = histDoc ? JSON.parse(histDoc.history) : [];

      // Carregar plano de ação da mentorada para personalizar o contexto
      const [planDoc] = await dbQuery(env, "SELECT content, filename FROM action_plans WHERE user_id = ?", [userId]);
      let systemPrompt = ESTRATEGISTA_SYSTEM;
      if (planDoc && planDoc.content) {
        // Limita o plano a 3000 caracteres para não exceder o contexto
        const planContent = planDoc.content.slice(0, 3000);
        systemPrompt += `\n\n====== PLANO DE AÇÃO DA MENTORADA (${planDoc.filename}) ======\n${planContent}\n====== FIM DO PLANO ======\n\nIMPORTANTE: Use este plano como base. Se a mentorada confirmar que quer as ações da semana, gere de 3 a 5 ações específicas usando o formato: PROJETAR_TAREFA: [título] | [descrição breve]`;
      } else if (!history.length) {
        systemPrompt += "\n\nA mentorada ainda não enviou o Plano de Ação. Oriente-a a clicar em 'Plano de Ação' acima para fazer o upload do PDF.";
      }

      let response;
      try {
        const result = await callGemini(env.GEMINI_API_KEY, "gemini-2.0-flash", systemPrompt, history.slice(-10), body.message);
        response = result.text;
      } catch (geminiError) {
        // Tenta sem histórico em caso de erro
        try {
          const result = await callGemini(env.GEMINI_API_KEY, "gemini-2.0-flash", ESTRATEGISTA_SYSTEM, [], body.message);
          response = result.text;
        } catch (e2) {
          return error("A Estrategista está indisponível no momento. Tente novamente em alguns segundos.", 503);
        }
      }

      // Atualizar histórico
      const newHistory = [...history,
        { role: "user", parts: [body.message] },
        { role: "model", parts: [response] }
      ];
      const histJson = JSON.stringify(newHistory);

      if (histDoc) {
        await dbRun(env, "UPDATE chat_history SET history = ? WHERE session_id = ?", [histJson, sessionId]);
      } else {
        await dbRun(env,
          "INSERT INTO chat_history (session_id, user_id, history, created_at) VALUES (?, ?, ?, ?)",
          [sessionId, userId, histJson, now()]
        );
      }

      // Sincronizar tarefas se houver marcador
      if (response.includes("PROJETAR_TAREFA:")) {
        const tasks = [...response.matchAll(/PROJETAR_TAREFA:\s*(.*?)\s*\|\s*(.*)/g)];
        const d = new Date(); const day = d.getDay();
        d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        const weekStart = d.toISOString().split('T')[0];
        for (const [, title, desc] of tasks) {
          const ts = now();
          await dbRun(env,
            "INSERT INTO weekly_actions (id, user_id, title, description, completed, week_start, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)",
            [uuid(), userId, title.trim(), desc.trim(), weekStart, ts, ts]
          );
        }
      }

      return json({ response, session_id: sessionId });
    } catch (e) {
      return error(`Erro na Estrategista: ${e.message}`, 500);
    }
  }

  if (path === "/ai/analyze-objection" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const body = await request.json();
      const prompt = `Analise o print desta conversa de vendas. RESPONDA em 3 blocos:

**Gargalo:**
Identifique a objeção REAL. É falta de dinheiro, medo, falta de urgência ou objeção de valor?

**Script:**
Crie mensagem exata, palavra por palavra, pronta para copiar.

**Missão:**
O que fazer após enviar o script.`;

      const { text } = await callGemini(env.GEMINI_API_KEY, "gemini-2.0-flash", ESTRATEGISTA_SYSTEM, [], prompt, body.image);

      const lines = text.split("\n");
      const gargalo = [], script = [], missao = [];
      let section = null;
      for (const line of lines) {
        const ll = line.toLowerCase();
        if (ll.includes("gargalo") && ll.includes(":")) { section = "gargalo"; continue; }
        if (ll.includes("script") && ll.includes(":")) { section = "script"; continue; }
        if (ll.includes("miss") && ll.includes(":")) { section = "missao"; continue; }
        if (line.trim()) {
          if (section === "gargalo") gargalo.push(line.trim());
          else if (section === "script") script.push(line.trim());
          else if (section === "missao") missao.push(line.trim());
        }
      }
      return json({
        gargalo: gargalo.join("\n") || "Analisando...",
        script: script.join("\n") || "Criando script...",
        missao: missao.join("\n") || "Definindo próximos passos..."
      });
    } catch (e) {
      return error(`Erro: ${e.message}`, 500);
    }
  }

  if (path === "/ai/analyze-profile" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const body = await request.json();
      const { image, visualIdentity = "Não informada" } = body;
      if (!image) return error("Imagem obrigatória");

      const analysisPrompt = `Analise este print de perfil do Instagram e forneça análise estratégica.

DADOS DO USUÁRIO: ${visualIdentity}

FORMATO OBRIGATÓRIO:
📸 FOTO DE PERFIL
[análise]

📝 BIO
[análise]

👤 NOME DE USUÁRIO
[análise]

⭐ DESTAQUES
[análise]

📱 FEED
[análise]

🎯 MISSÃO DO DIA
[ação específica para hoje]

Seja direta, firme e acionável.`;

      const { text: analysisText } = await callGemini(
        env.GEMINI_API_KEY, "gemini-2.0-flash",
        "Você é A Estrategista, especialista em posicionamento digital baseada na metodologia Andressa Mallinsk.",
        [], analysisPrompt, image
      );

      // Tentar gerar imagem melhorada com gemini-2.0-flash-preview-image-generation
      let afterImageUrl = `data:image/jpeg;base64,${image.includes(",") ? image.split(",")[1] : image}`;
      try {
        const { images } = await callGemini(
          env.GEMINI_API_KEY, "gemini-2.0-flash-preview-image-generation",
          IMAGE_PROTECTION_SYSTEM, [],
          "Crie uma versão melhorada deste perfil do Instagram: bio mais clara, elementos mais profissionais, aparência de autoridade. Mantenha a identidade 100% fiel.",
          image
        );
        if (images.length > 0) {
          afterImageUrl = `data:${images[0].mimeType};base64,${images[0].data}`;
        }
      } catch (imgErr) {
        // Fallback: retorna imagem original se geração falhar
        console.log("Geração de imagem não disponível:", imgErr.message);
      }

      return json({ analysisText, imageUrl: afterImageUrl });
    } catch (e) {
      return error(`Erro ao analisar perfil: ${e.message}`, 500);
    }
  }

  if (path === "/ai/generate-photoshoot" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const body = await request.json();
      const { prompt, baseImage, numImages = 4 } = body;
      const count = Math.min(numImages, 6);

      const base64Img = baseImage?.base64 || baseImage;
      let personDescription = "";
      if (base64Img) {
        try {
          const descPrompt = `Analyze the person's face in this image and provide a highly detailed physical description in English for an AI image generator (like Imagen) to recreate this exact person's face and likeness as closely as possible.
Be extremely detailed about:
1. Face details: precise face shape, forehead, cheekbones, chin, jawline.
2. Hair: exact texture, type (e.g. curly, coiled, afro-textured, straight, wavy), color, length, volume, parting.
3. Eyes: shape, eyelid type, color, eyebrows thickness and arch.
4. Nose: bridge shape, width, nostril size.
5. Mouth: lip thickness, shape, smile, teeth visibility.
6. Skin: exact color tone, complexion, undertone, facial details.
7. Ethnicity, gender, and approximate age.

Write the description in a single paragraph, focusing entirely on facial likeness. Do not mention the background or clothes. Write ONLY in English.`;
          const { text } = await callGemini(env.GEMINI_API_KEY, "gemini-2.0-flash", "", [], descPrompt, base64Img);
          personDescription = text;
        } catch (e) {
          console.log("Erro ao obter descrição fisionômica:", e.message);
        }
      }

      let englishPrompt = prompt;
      try {
        const translatePrompt = `Translate this image scenario prompt to English, making it natural and descriptive for an AI image generator: "${prompt}". Respond only with the English translation.`;
        const { text } = await callGemini(env.GEMINI_API_KEY, "gemini-2.0-flash", "", [], translatePrompt);
        englishPrompt = text;
      } catch (e) {
        console.log("Translation failed:", e.message);
      }

      const styles = [
        "premium professional photography, studio lighting",
        "corporate portrait of high luxury, sharp focus",
        "cinematic style 8k, natural light",
        "medium shot, absolute facial sharpness",
        "editorial photography, realistic skin, natural texture",
        "hyper-realistic artistic portrait"
      ];

      const results = await Promise.allSettled(
        Array.from({ length: count }, async (_, i) => {
          const style = styles[i % styles.length];
          let fullPrompt = `A high-quality professional portrait, editorial style. Scenario: ${englishPrompt}. Style: ${style}.`;
          if (personDescription) {
            fullPrompt += ` The subject of the photo is a person with the following appearance: ${personDescription}.`;
          }
          fullPrompt += ` Ensure highly realistic facial features, natural skin texture, accurate facial details, keeping the identity consistent with the description.`;
          const { images } = await callGemini(
            env.GEMINI_API_KEY, "imagen-4.0-generate-001",
            null, [], fullPrompt
          );
          if (images.length > 0) return { id: i + 1, imageUrl: `data:${images[0].mimeType};base64,${images[0].data}` };
          return null;
        })
      );

      const generated = results
        .filter(r => r.status === "fulfilled" && r.value)
        .map(r => r.value);

      if (generated.length === 0) return error("Não foi possível gerar imagens. Tente um prompt mais específico.", 500);
      return json({ images: generated, total: generated.length });
    } catch (e) {
      return error(`Erro: ${e.message}`, 500);
    }
  }

  if (path === "/ai/edit-image" && method === "POST") {
    const userId = await authenticate(request, env);
    if (!userId) return error("Token inválido", 401);
    try {
      const body = await request.json();
      const { prompt, image } = body;
      const base64Img = image?.base64 || image;
      if (!base64Img || !prompt) return error("Imagem e prompt são obrigatórios");

      let editPrompt = prompt;
      try {
        const descPrompt = `Analyze the provided image and write a detailed scene description in English that incorporates the following changes requested by the user: "${prompt}". The final description should be optimized for a text-to-image AI generator to produce the updated scene. Write ONLY the final description in English.`;
        const { text } = await callGemini(env.GEMINI_API_KEY, "gemini-2.0-flash", "", [], descPrompt, base64Img);
        editPrompt = text;
      } catch (e) {
        console.log("Erro ao descrever edição:", e.message);
      }

      const { images } = await callGemini(
        env.GEMINI_API_KEY, "imagen-4.0-generate-001",
        null, [], editPrompt
      );

      if (images.length > 0) {
        return json({ imageUrl: `data:${images[0].mimeType};base64,${images[0].data}` });
      }
      return error("Não foi possível editar a imagem. Tente novamente.", 500);
    } catch (e) {
      return error(`Erro ao editar imagem: ${e.message}`, 500);
    }
  }

  return error("Rota não encontrada", 404);
}

// ---------- ENTRY POINT ----------

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      console.error("Worker error:", e);
      return json({ detail: "Erro interno do servidor" }, 500);
    }
  }
};
