import { useState } from 'react';
import axios from 'axios';
import { Camera, Upload, Download } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function PhotoshootCreator() {
  const [baseImage, setBaseImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [numImages, setNumImages] = useState(4);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [used, setUsed] = useState(0);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBaseImage({ base64: reader.result.split(',')[1], preview: reader.result });
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!prompt.trim()) { alert('Descreva o ensaio primeiro.'); return; }
    if (used >= 20) { alert('Limite de 20 fotos por dia atingido.'); return; }
    setLoading(true); setImages([]);
    try {
      const { data } = await axios.post(`${API}/ai/generate-photoshoot`, { prompt, baseImage, numImages }, auth());
      setImages(data.images || []);
      setUsed(u => u + (data.images?.length || 0));
    } catch { alert('Erro ao gerar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const download = (url, i) => {
    const a = document.createElement('a'); a.href = url; a.download = `ensaio-${i+1}.jpg`; a.click();
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px', background: '#080808' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#E0E0E0', marginBottom: '6px' }}>Criar Ensaio Fotográfico</h1>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>Envie uma foto sua e descreva o ensaio. A IA gera fotos profissionais mantendo sua identidade.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Config */}
        <div style={{ background: '#111', border: '1px solid #1E0505', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Foto Base (opcional)
            </label>
            <label style={{ display: 'block', border: '2px dashed #2A0808', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
              {baseImage ? (
                <img src={baseImage.preview} alt="" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }} />
              ) : (
                <><Upload size={20} style={{ color: '#C0392B', margin: '0 auto 6px' }} /><p style={{ color: '#555', fontSize: '12px' }}>Enviar foto base</p></>
              )}
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Descrição do Ensaio
            </label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="Ex: ensaio corporativo em escritório de luxo, iluminação suave, tom profissional e elegante..."
              rows={4} className="fire-input" style={{ resize: 'none', fontFamily: 'inherit', fontSize: '13px' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Quantidade de Fotos
            </label>
            <select value={numImages} onChange={e => setNumImages(+e.target.value)} className="fire-input" style={{ fontSize: '13px' }}>
              {[2,4,6].map(n => <option key={n} value={n}>{n} fotos</option>)}
            </select>
          </div>

          <div style={{ fontSize: '11px', color: '#444', textAlign: 'center' }}>{used}/20 usadas hoje</div>

          <button onClick={generate} disabled={loading || !prompt.trim()} className="fire-btn" style={{ width: '100%', padding: '12px' }}>
            {loading ? 'Gerando...' : '📸 Gerar Ensaio'}
          </button>
        </div>

        {/* Galeria */}
        <div>
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {[...Array(numImages)].map((_, i) => (
                <div key={i} style={{ aspectRatio: '1', background: '#111', borderRadius: '10px', border: '1px solid #1E0505', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          )}
          {images.length > 0 && !loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1E0505' }}>
                  <img src={img.imageUrl} alt={`Ensaio ${i+1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                  <button onClick={() => download(img.imageUrl, i)}
                    style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '6px', padding: '6px 10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <Download size={12} /> Baixar
                  </button>
                </div>
              ))}
            </div>
          )}
          {!loading && images.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#333' }}>
              <Camera size={40} style={{ marginBottom: '12px', color: '#2A0808' }} />
              <p style={{ fontSize: '14px' }}>Seu ensaio fotográfico aparecerá aqui</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.6} }`}</style>
    </div>
  );
}
