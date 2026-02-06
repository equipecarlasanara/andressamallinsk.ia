import { useState, useRef } from 'react';
import axios from 'axios';
import { Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function ProfileAnalysis() {
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [analysisText, setAnalysisText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setAfterImage(null);
    setAnalysisText('');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64String = reader.result;
      setBeforeImage(base64String);

      try {
        const response = await axios.post(
          `${API}/ai/analyze-profile`,
          { image: base64String.split(',')[1], mimeType: file.type },
          getAuthHeaders()
        );
        setAfterImage(response.data.imageUrl);
        setAnalysisText(response.data.analysisText || '');
      } catch (err) {
        console.error('Erro na análise de perfil:', err);
        setError('Ocorreu um erro ao realizar a análise visual. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };
  };

  const handleDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 h-full flex flex-col bg-[#19161B] overflow-y-auto" data-testid="profile-analysis">
      <h1 className="text-3xl font-title text-[#CBC8C9] mb-4 border-b border-[#3A0A16] pb-2">
        Análise de Perfil
      </h1>
      <p className="text-[#CBC8C9]/80 mb-4">
        Envie um print do seu perfil do Instagram e A Estrategista irá devolver uma análise visual com os ajustes necessários para destravar seu posicionamento e conversão.
      </p>

      {!beforeImage && !isLoading && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col flex-grow items-center justify-center bg-black/30 border-2 border-dashed border-[#3A0A16] rounded-lg p-4 cursor-pointer hover:border-[#53050B]"
        >
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-center">
            <p className="mb-4 text-[#CBC8C9]/70">Clique para enviar o print do seu perfil.</p>
            <button className="px-6 py-2 bg-[#53050B] text-white rounded-lg font-semibold hover:bg-red-800 pointer-events-none">
              Enviar Print
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col flex-grow items-center justify-center">
          <div className="w-32 h-32 border-8 border-gray-200 border-t-[#53050B] rounded-full animate-spin"></div>
          <p className="mt-4 text-lg">Analisando e reconstruindo seu perfil...</p>
        </div>
      )}

      {beforeImage && !isLoading && (
        <div className="flex-grow">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-title text-center mb-4">Antes</h2>
              <img
                src={beforeImage}
                alt="Perfil antes da análise"
                className="w-full max-w-sm object-contain rounded-lg border border-[#3A0A16]"
              />
            </div>
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-title text-center mb-4">Depois</h2>
              {afterImage ? (
                <div className="relative group w-full max-w-sm">
                  <img
                    src={afterImage}
                    alt="Perfil depois da análise"
                    className="w-full object-contain rounded-lg border border-[#53050B]"
                  />
                  <button
                    onClick={() => handleDownload(afterImage, 'perfil-analisado.png')}
                    className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-[#53050B] transition-opacity opacity-0 group-hover:opacity-100"
                    aria-label="Baixar Imagem"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-sm h-[400px] flex items-center justify-center bg-black/20 border border-[#53050B] rounded-lg text-center p-4">
                  A imagem aprimorada aparecerá aqui.
                </div>
              )}
            </div>
          </div>

          {analysisText && (
            <div className="mt-6 p-6 border border-[#3A0A16] rounded-lg bg-black/30">
              <h2 className="text-xl font-title text-[#D4AF37] mb-4">Análise Estratégica:</h2>
              <div className="text-[#CBC8C9]/90 whitespace-pre-wrap leading-relaxed space-y-4">
                {analysisText.split('\n').map((line, index) => {
                  // Destacar títulos com emojis
                  if (line.match(/^[📸📝👤⭐📱🎯]/)) {
                    return (
                      <p key={index} className="font-bold text-[#D4AF37] mt-4 text-lg">
                        {line}
                      </p>
                    );
                  }
                  return line.trim() ? <p key={index}>{line}</p> : null;
                })}
              </div>
              <button
                onClick={() => {
                  setBeforeImage(null);
                  setAfterImage(null);
                  setAnalysisText('');
                  setError(null);
                }}
                className="mt-6 px-6 py-2 bg-[#53050B] text-white rounded-lg font-semibold hover:bg-red-800"
              >
                Analisar Outro Perfil
              </button>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="text-red-400 text-center mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}