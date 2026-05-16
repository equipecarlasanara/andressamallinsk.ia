import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Send, Upload, FileText, X, Trash2, CheckCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function EstrategistaDigital() {
  const [msgs, setMsgs] = useState([{
    role: 'ai',
    text: 'Olá leoa! 🔥\n\nPara eu te ajudar de forma personalizada, faça o upload do seu Plano de Ação Individual (PDF) clicando em "Plano de Ação" acima.\n\nSe já enviou antes, pode ir direto — estou aqui!'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`s_${Date.now()}`);
  const [plan, setPlan] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const loadPlan = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/action-plan`, auth());
      if (data) setPlan(data);
    } catch {}
  }, []);

  useEffect(() => { loadPlan(); }, [loadPlan]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const uploadPlan = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') { alert('Selecione um arquivo PDF.'); return; }
    setUploading(true);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data } = await axios.post(`${API}/action-plan`, { filename: file.name, content: b64, is_pdf: true }, auth());
      setPlan({ filename: file.name, uploaded_at: data.uploaded_at });
      setUploadDone(true);
      setTimeout(() => setUploadDone(false), 3000);
      setMsgs(m => [...m, { role: 'ai', text: `Recebi seu Plano de Ação — ${file.name}! 📋\n\nJá li todo o material. Agora posso te ajudar de forma totalmente personalizada.\n\nA partir desse plano, gostaria de receber as ações desta semana?` }]);
    } catch { alert('Erro ao enviar. Tente novamente.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const removePlan = async () => {
    if (!window.confirm('Remover o Plano de Ação atual?')) return;
    try { await axios.delete(`${API}/action-plan`, auth()); setPlan(null); } catch { alert('Erro ao remover.'); }
  };

  const send = async (override) => {
    const text = override || input.trim();
    if (!text || loading) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/chat`, { message: text, session_id: sessionId }, auth());
      const clean = data.response.replace(/PROJETAR_TAREFA:.*$/gm, '').trim();
      setMsgs(m => [...m, { role: 'ai', text: clean }]);
      if (data.response.includes('PROJETAR_TAREFA:')) {
        setTimeout(() => setMsgs(m => [...m, { role: 'ai', text: '✅ Suas ações da semana foram adicionadas ao Dashboard de Metas!' }]), 800);
      }
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Tive um problema técnico. Pode repetir, Leoa?' }]);
    } finally { setLoading(false); }
  };

  const lastMsg = msgs[msgs.length - 1];
  const showWeekOffer = !loading && lastMsg?.role === 'ai' && lastMsg.text.includes('ações desta semana');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A0505', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0C0C0C' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo-fire-branco.png" alt="" style={{ width: '80px', filter: 'drop-shadow(0 0 8px rgba(192,57,43,0.4))' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {plan ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '8px', padding: '6px 12px' }}>
              <FileText size={13} style={{ color: '#C0392B' }} />
              <span style={{ color: '#C0606A', fontSize: '12px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.filename}</span>
              <button onClick={removePlan} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0, display: 'flex' }}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: '8px', padding: '7px 14px', color: '#C0392B', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
              {uploading ? <div style={{ width: 13, height: 13, border: '1px solid #C0392B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : uploadDone ? <CheckCircle size={13} /> : <Upload size={13} />}
              {uploading ? 'Enviando...' : uploadDone ? 'Enviado!' : 'Plano de Ação'}
            </button>
          )}
          <input ref={fileRef} type="file" accept=".pdf" onChange={uploadPlan} style={{ display: 'none' }} />
          <button onClick={() => { if (window.confirm('Reiniciar conversa?')) setMsgs([{ role: 'ai', text: 'Nova conversa iniciada! Como posso te ajudar, Leoa? 🔥' }]); }}
            style={{ background: 'none', border: '1px solid #1A0505', borderRadius: '8px', padding: '7px', color: '#444', cursor: 'pointer', display: 'flex' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '14px 18px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? 'linear-gradient(135deg, #5A0808, #C0392B)' : '#141414',
              border: m.role === 'user' ? 'none' : '1px solid #1E0505',
              color: m.role === 'user' ? '#fff' : '#D0D0D0',
              boxShadow: m.role === 'user' ? '0 4px 15px rgba(192,57,43,0.3)' : 'none',
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {showWeekOffer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <button onClick={() => send('Sim! Quero as ações desta semana baseadas no meu plano.')} className="fire-btn" style={{ textAlign: 'left', padding: '12px 20px' }}>
              ✅ Sim! Quero as ações desta semana
            </button>
            <button onClick={() => send('Prefiro tirar uma dúvida estratégica primeiro.')}
              style={{ background: 'transparent', border: '1px solid #2A0808', borderRadius: '10px', padding: '12px 20px', color: '#888', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}>
              💬 Prefiro tirar uma dúvida primeiro
            </button>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#141414', border: '1px solid #1E0505', borderRadius: '16px 16px 16px 4px', padding: '14px 18px', display: 'flex', gap: '5px', alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0392B', animation: `bounce 1s ${i*0.15}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1A0505', background: '#0C0C0C' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={plan ? 'Fale com a Estrategista Fire...' : 'Envie seu Plano de Ação ou escreva sua dúvida...'}
            rows={1} className="fire-input"
            style={{ flex: 1, resize: 'none', minHeight: '46px', maxHeight: '120px', fontFamily: 'inherit' }} />
          <button onClick={() => send()} disabled={!input.trim() || loading} className="fire-btn"
            style={{ padding: '12px 16px', flexShrink: 0 }}>
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
