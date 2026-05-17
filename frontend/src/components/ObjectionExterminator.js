import { useState } from 'react';
import axios from 'axios';
import { Upload, Zap } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function ObjectionExterminator() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result.split(',')[1]); setPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!image) { alert('Envie o print da conversa primeiro.'); return; }
    setLoading(true); setResult(null);
    try {
      const { data } = await axios.post(`${API}/ai/analyze-objection`, { image }, auth());
      setResult(data);
    } catch { alert('Erro ao analisar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px', background: '#080808' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#E0E0E0', marginBottom: '6px' }}>Exterminador de Objeção</h1>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>Envie o print da conversa e receba o script exato para reverter e fechar.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '900px' }}>
        {/* Upload */}
        <div style={{ background: '#111', border: '1px solid #1E0505', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ color: '#E0E0E0', fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={15} style={{ color: '#C0392B' }} /> Print da Conversa
          </h3>
          <label style={{ display: 'block', border: '2px dashed #2A0808', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2A0808'}>
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
            ) : (
              <>
                <Upload size={28} style={{ color: '#C0392B', margin: '0 auto 8px' }} />
                <p style={{ color: '#666', fontSize: '13px' }}>Clique para enviar o print da conversa</p>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          <button onClick={analyze} disabled={loading || !image} className="fire-btn"
            style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
            {loading ? 'Analisando...' : '⚡ Exterminar Objeção'}
          </button>
        </div>

        {/* Resultado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { key: 'gargalo', label: '🎯 Gargalo Identificado', color: '#C0392B' },
            { key: 'script', label: '💬 Script de Conversão', color: '#3ECF8E' },
            { key: 'missao', label: '🚀 Missão', color: '#9B6FE0' },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ background: '#111', border: `1px solid ${color}22`, borderRadius: '12px', padding: '20px', borderLeft: `3px solid ${color}` }}>
              <h3 style={{ color, fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>{label}</h3>
              {loading ? (
                <div style={{ height: '14px', background: '#1A0505', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
              ) : result ? (
                <p style={{ color: '#CCC', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{result[key]}</p>
              ) : (
                <p style={{ color: '#333', fontSize: '12px' }}>Aguardando análise...</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
    </div>
  );
}
