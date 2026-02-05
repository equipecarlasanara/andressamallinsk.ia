import { useState, useRef } from 'react';
import axios from 'axios';
import { Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function ObjectionExterminator() {
  const [imagePreview, setImagePreview] = useState(null);
  const [gargalo, setGargalo] = useState('');
  const [script, setScript] = useState('');
  const [mission, setMission] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleAnalyze(file);
    }
  };

  const handleAnalyze = async (file) => {
    setIsLoading(true);
    setGargalo('');
    setScript('');
    setMission('');
    setError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      setImagePreview(reader.result);
      try {
        const base64String = reader.result.split(',')[1];
        const response = await axios.post(
          `${API}/ai/analyze-objection`,
          { image: base64String, mimeType: file.type },
          getAuthHeaders()
        );

        const data = response.data;
        setGargalo(data.gargalo || '');
        setScript(data.script || '');
        setMission(data.missao || '');
      } catch (err) {
        console.error('Erro ao analisar objeção:', err);
        setError('Não foi possível analisar a imagem. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };
  };

  const handleReset = () => {
    setImagePreview(null);
    setGargalo('');
    setScript('');
    setMission('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-[#19161B]" data-testid="objection-exterminator">
      <h1 className="text-3xl font-title text-[#CBC8C9] mb-4 border-b border-[#3A0A16] pb-2">
        Exterminador de Objeção
      </h1>
      <p className="text-[#CBC8C9]/80 mb-4">
        Recebeu uma objeção e não sabe como responder? Envie o print da conversa e receba o script exato para reverter a situação e avançar para o fechamento.
      </p>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
        <div className="flex flex-col items-center justify-center bg-black/30 border-2 border-dashed border-[#3A0A16] rounded-lg p-4">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          {imagePreview ? (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <img
                src={imagePreview}
                alt="Preview da conversa"
                className="max-h-[80%] w-auto object-contain rounded-lg mb-4"
              />
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-[#53050B] text-white rounded-lg font-semibold hover:bg-red-800 transition-colors"
              >
                Analisar Nova Conversa
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-4 text-[#CBC8C9]/70">Arraste e solte ou clique para enviar o print.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-[#53050B] text-white rounded-lg font-semibold hover:bg-red-800"
              >
                Enviar Print
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col bg-black/30 border border-[#3A0A16] rounded-lg p-4 overflow-y-auto">
          {isLoading && (
            <div className="m-auto text-center">
              <div className="w-16 h-16 border-8 border-gray-200 border-t-[#53050B] rounded-full animate-spin mx-auto mb-4"></div>
              Analisando e criando script...
            </div>
          )}
          {error && <p className="text-red-400 m-auto">{error}</p>}

          {gargalo && !isLoading && (
            <>
              <h2 className="text-xl font-title text-[#CBC8C9] mb-3">O Gargalo</h2>
              <div className="bg-[#19161B] p-4 rounded-lg mb-6">
                <p className="text-[#CBC8C9]/90 leading-relaxed">{gargalo}</p>
              </div>
              
              <h2 className="text-xl font-title text-[#CBC8C9] mb-3">Script Exato (Copie e Cole)</h2>
              <div className="bg-[#19161B] p-4 rounded-lg mb-6 relative group">
                <p className="text-[#CBC8C9]/90 whitespace-pre-wrap leading-relaxed">{script}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(script)}
                  className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  Copiar
                </button>
              </div>
              
              {mission && (
                <>
                  <h2 className="text-xl font-title text-[#D4AF37] mb-3">Sua Missão</h2>
                  <div className="bg-[#19161B] border border-[#D4AF37]/30 p-4 rounded-lg">
                    <p className="text-white whitespace-pre-wrap leading-relaxed">{mission}</p>
                  </div>
                </>
              )}
            </>
          )}

          {!isLoading && !gargalo && !error && (
            <div className="m-auto text-center text-gray-400">
              <h2 className="text-xl font-title text-[#CBC8C9] mb-2">Script de Conversão</h2>
              <p>Seu script para quebrar a objeção aparecerá aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}