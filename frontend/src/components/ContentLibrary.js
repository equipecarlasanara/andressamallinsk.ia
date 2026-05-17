import { useState, useCallback } from 'react';
import axios from 'axios';
import { BookOpen, Sparkles } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const TABS = ['reels', 'carrossel', 'postEstatico', 'stories', 'ads'];
const TAB_LABELS = { reels: 'Reels', carrossel: 'Carrossel', postEstatico: 'Post Estático', stories: 'Stories', ads: 'Criativos (ADS)' };

export default function ContentLibrary() {
  const [niche, setNiche] = useState('');
  const [themes, setThemes] = useState(null);
  const [activeTab, setActiveTab] = useState('reels');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [content, setContent] = useState('');
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  const generateThemes = async () => {
    if (!niche.trim()) { alert('Digite seu nicho primeiro.'); return; }
    setLoadingThemes(true); setThemes(null); setSelectedTheme(null); setContent('');
    try {
      const { data } = await axios.post(`${API}/ai/generate-themes`, { niche }, auth());
      setThemes(data);
    } catch { alert('Erro ao gerar temas.'); }
    finally { setLoadingThemes(false); }
  };

  const generateContent = useCallback(async (theme) => {
    setSelectedTheme(theme); setContent(''); setLoadingContent(true);
    try {
      const { data } = await axios.post(`${API}/ai/generate-content`, { niche, title: theme.title, description: theme.description, content_type: activeTab }, auth());
      setContent(data.content);
    } catch { setContent('Erro ao gerar conteúdo.'); }
    finally { setLoadingContent(false); }
  }, [niche, activeTab]);

  const currentThemes = themes?.[activeTab] || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #1A0505' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#E0E0E0', marginBottom: '6px' }}>Biblioteca de Conteúdo</h1>
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <input value={niche} onChange={e => setNiche(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateThemes()}
            placeholder="Digite seu nicho de mercado..." className="fire-input" style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }} />
          <button onClick={generateThemes} disabled={loadingThemes || !niche.trim()} className="fire-btn" style={{ padding: '10px 20px', flexShrink: 0 }}>
            {loadingThemes ? 'Gerando...' : '✨ Gerar Temas'}
          </button>
        </div>
      </div>

      {themes && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', padding: '12px 28px', borderBottom: '1px solid #1A0505', background: '#0C0C0C' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.15s',
                  background: activeTab === tab ? '#C0392B' : 'transparent', color: activeTab === tab ? '#fff' : '#555' }}>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr', overflow: 'hidden' }}>
            {/* Lista de temas */}
            <div style={{ borderRight: '1px solid #1A0505', overflowY: 'auto', padding: '12px' }}>
              {currentThemes.map((theme, i) => (
                <button key={i} onClick={() => generateContent(theme)}
                  style={{ width: '100%', textAlign: 'left', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', marginBottom: '4px', transition: 'all 0.15s',
                    background: selectedTheme?.title === theme.title ? 'linear-gradient(135deg, #2A0808, rgba(192,57,43,0.2))' : 'transparent',
                    borderLeft: selectedTheme?.title === theme.title ? '2px solid #C0392B' : '2px solid transparent' }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: '#CCC', margin: 0 }}>{theme.title}</p>
                  <p style={{ fontSize: '11px', color: '#555', margin: '3px 0 0' }}>{theme.description}</p>
                </button>
              ))}
            </div>

            {/* Roteiro */}
            <div style={{ overflowY: 'auto', padding: '24px' }}>
              {loadingContent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ height: '16px', background: '#111', borderRadius: '4px', animation: 'pulse 1.5s infinite', width: i % 3 === 0 ? '60%' : '100%' }} />
                  ))}
                </div>
              )}
              {content && !loadingContent && (
                <div style={{ background: '#111', border: '1px solid #1E0505', borderRadius: '12px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: '#E0E0E0', fontSize: '15px', fontWeight: '600', margin: 0 }}>{selectedTheme?.title}</h3>
                    <button onClick={() => navigator.clipboard.writeText(content)}
                      style={{ background: 'transparent', border: '1px solid #2A0808', borderRadius: '6px', padding: '6px 12px', color: '#888', cursor: 'pointer', fontSize: '11px' }}>
                      Copiar
                    </button>
                  </div>
                  <p style={{ color: '#CCC', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{content}</p>
                </div>
              )}
              {!content && !loadingContent && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#333' }}>
                  <BookOpen size={32} style={{ marginBottom: '10px', color: '#2A0808' }} />
                  <p style={{ fontSize: '13px' }}>Selecione um tema para gerar o roteiro</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!themes && !loadingThemes && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
          <Sparkles size={40} style={{ marginBottom: '12px', color: '#2A0808' }} />
          <p style={{ fontSize: '14px' }}>Digite seu nicho e gere temas estratégicos</p>
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.6} }`}</style>
    </div>
  );
}
