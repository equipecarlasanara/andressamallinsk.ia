import { useState } from 'react';
import axios from 'axios';
import { Upload, Download, Edit3 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function ImageEditor() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImage({ base64: reader.result.split(',')[1] }); setPreview(reader.result); setResult(null); };
    reader.readAsDataURL(file);
  };

  const edit = async () => {
    if (!image || !prompt.trim()) { alert('Envie uma imagem e descreva a edição.'); return; }
    setLoading(true); setResult(null);
    try {
      const { data } = await axios.post(`${API}/ai/edit-image`, { image, prompt }, auth());
      setResult(data.imageUrl);
    } catch { alert('Erro ao editar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const download = () => {
    const a = document.createElement('a'); a.href = result; a.download = 'imagem-editada.jpg'; a.click();
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px', background: '#080808' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#E0E0E0', marginBottom: '6px' }}>Editor de Fotos</h1>
      <p style={{ color: '#999', fontSize: '13px', marginBottom: '28px' }}>Envie uma imagem e use comandos de texto para editá-la com IA.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '900px' }}>
        {/* Original */}
        <div style={{ background: '#111', border: '1px solid #1E0505', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ color: '#E0E0E0', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Imagem Original</h3>
          <label style={{ display: 'block', border: '2px dashed #2A0808', borderRadius: '10px', padding: preview ? '0' : '40px', textAlign: 'center', cursor: 'pointer', overflow: 'hidden' }}>
            {preview ? (
              <img src={preview} alt="Original" style={{ width: '100%', borderRadius: '8px', display: 'block' }} />
            ) : (
              <><Upload size={28} style={{ color: '#C0392B', margin: '0 auto 8px' }} /><p style={{ color: '#AAA', fontSize: '13px' }}>Clique para enviar</p></>
            )}
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </label>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#AAA', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Comando de Edição
            </label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder='Ex: "Adicione um filtro retrô", "Remova o fundo", "Mude o cenário para escritório"...'
              rows={3} className="fire-input" style={{ resize: 'none', fontFamily: 'inherit', fontSize: '13px' }} />
          </div>

          <button onClick={edit} disabled={loading || !image || !prompt.trim()} className="fire-btn"
            style={{ width: '100%', marginTop: '16px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Edit3 size={14} />
            {loading ? 'Editando...' : 'Aplicar Edição'}
          </button>
        </div>

        {/* Resultado */}
        <div style={{ background: '#111', border: '1px solid #1E0505', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ color: '#E0E0E0', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Imagem Editada</h3>
          {loading && (
            <div style={{ aspectRatio: '1', background: '#0A0A0A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
              <p style={{ color: '#888', fontSize: '13px' }}>Processando...</p>
            </div>
          )}
          {result && !loading && (
            <>
              <img src={result} alt="Editada" style={{ width: '100%', borderRadius: '8px', border: '1px solid #2A0808' }} />
              <button onClick={download} className="fire-btn" style={{ width: '100%', marginTop: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}>
                <Download size={14} /> Baixar
              </button>
            </>
          )}
          {!result && !loading && (
            <div style={{ aspectRatio: '1', background: '#0A0A0A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#777', fontSize: '13px' }}>Resultado aparecerá aqui</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:0.8} }`}</style>
    </div>
  );
}
