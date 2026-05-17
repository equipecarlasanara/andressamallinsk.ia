import { useState } from 'react';
import axios from 'axios';
import { Upload, User } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function ProfileAnalysis() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [visualIdentity, setVisualIdentity] = useState('');
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
    if (!image) { alert('Envie um print do seu perfil primeiro.'); return; }
    setLoading(true); setResult(null);
    try {
      const { data } = await axios.post(`${API}/ai/analyze-profile`, { image, visualIdentity }, auth());
      setResult(data);
    } catch { alert('Erro ao analisar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px', background: '#080808' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#E0E0E0', marginBottom: '6px' }}>Análise de Perfil</h1>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>Envie um print do seu perfil do Instagram e receba uma análise estratégica completa.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '900px' }}>
        {/* Upload */}
        <div style={{ background: '#111', border: '1px solid #1E0505', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ color: '#E0E0E0', fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={15} style={{ color: '#C0392B' }} /> Print do Perfil
          </h3>
          <label style={{ display: 'block', border: '2px dashed #2A0808', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2A0808'}>
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }} />
            ) : (
              <>
                <Upload size={28} style={{ color: '#C0392B', margin: '0 auto 8px' }} />
                <p style={{ color: '#666', fontSize: '13px' }}>Clique para enviar o print</p>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </label>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Identidade Visual e Posicionamento
            </label>
            <textarea value={visualIdentity} onChange={e => setVisualIdentity(e.target.value)}
              placeholder="Ex: Minha paleta é dourado e preto, quero um posicionamento de autoridade..."
              rows={3} className="fire-input" style={{ resize: 'none', fontFamily: 'inherit', fontSize: '13px' }} />
          </div>

          <button onClick={analyze} disabled={loading || !image} className="fire-btn"
            style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
            {loading ? 'Analisando...' : 'Analisar Perfil'}
          </button>
        </div>

        {/* Resultado */}
        <div style={{ background: '#111', border: '1px solid #1E0505', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ color: '#E0E0E0', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Análise Estratégica</h3>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: '16px', background: '#1A0505', borderRadius: '4px', animation: 'pulse 1.5s infinite', width: i % 2 === 0 ? '100%' : '75%' }} />
              ))}
            </div>
          )}
          {result && !loading && (
            <div style={{ color: '#CCC', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {result.analysisText}
              {result.imageUrl && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ color: '#C0392B', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>PERFIL SUGERIDO:</p>
                  <img src={result.imageUrl} alt="Perfil melhorado" style={{ width: '100%', borderRadius: '8px', border: '1px solid #2A0808' }} />
                </div>
              )}
            </div>
          )}
          {!result && !loading && (
            <p style={{ color: '#333', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
              Envie um print e clique em Analisar
            </p>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
    </div>
  );
}
