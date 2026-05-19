import { useState } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function SalesFunnel() {
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Leoa! Vamos construir seu funil de vendas estratégico. 🔥\n\nPara começar, me diga: qual é o seu produto/serviço principal, para quem você vende e qual o preço?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`funnel_${Date.now()}`);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim(); setInput('');
    setMessages(m => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/build-funnel`, { message: text, session_id: sessionId }, auth());
      setMessages(m => [...m, { role: 'ai', text: data.response }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Erro ao processar. Tente novamente.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A0505', background: '#0C0C0C' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#E0E0E0', margin: 0 }}>Construtor de Funil de Vendas</h1>
        <p style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>Metodologia Andressa Mallinsk</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '14px 18px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? 'linear-gradient(135deg, #5A0808, #C0392B)' : '#141414',
              border: m.role === 'user' ? 'none' : '1px solid #1E0505',
              color: m.role === 'user' ? '#fff' : '#D0D0D0',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex' }}>
            <div style={{ background: '#141414', border: '1px solid #1E0505', borderRadius: '16px 16px 16px 4px', padding: '14px 18px', display: 'flex', gap: '5px' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0392B', animation: `bounce 1s ${i*0.15}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #1A0505', background: '#0C0C0C', display: 'flex', gap: '10px' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Responda aqui..." rows={1} className="fire-input"
          style={{ flex: 1, resize: 'none', minHeight: '46px', maxHeight: '120px', fontFamily: 'inherit', fontSize: '13px' }} />
        <button onClick={send} disabled={!input.trim() || loading} className="fire-btn" style={{ padding: '12px 16px', flexShrink: 0 }}>
          <Send size={16} />
        </button>
      </div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
    </div>
  );
}
