import { useState, useRef } from 'react';
import axios from 'axios';
import { Download, Camera, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DAILY_LIMIT = 20;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function PhotoshootCreator() {
  const [prompt, setPrompt] = useState('');
  const [numImages, setNumImages] = useState(10);
  const [baseImage, setBaseImage] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dailyCount, setDailyCount] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setBaseImage({ file, preview: URL.createObjectURL(file) });
    }
  };

  const handleGenerate = async () => {
    const imagesToGenerate = Math.min(numImages, DAILY_LIMIT - dailyCount);
    if (!prompt.trim() || imagesToGenerate <= 0) {
      if (dailyCount >= DAILY_LIMIT) {
        setError('Você atingiu o limite de 20 imagens por dia. Tente novamente amanhã.');
      }
      return;
    }

    setIsLoading(true);
    setGeneratedImages([]);
    setError(null);
    setProgress(0);

    try {
      let imagePayload = null;
      if (baseImage) {
        const reader = new FileReader();
        imagePayload = await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve({ base64, mimeType: baseImage.file.type });
          };
          reader.readAsDataURL(baseImage.file);
        });
      }

      const response = await axios.post(
        `${API}/ai/generate-photoshoot`,
        { prompt, numImages: imagesToGenerate, baseImage: imagePayload },
        { ...getAuthHeaders(), timeout: 300000 } // 5 min timeout para múltiplas imagens
      );

      setGeneratedImages(response.data.images || []);
      setDailyCount(prev => prev + (response.data.total || 0));
      setProgress(100);
    } catch (err) {
      console.error('Erro ao gerar ensaio:', err);
      setError('Não foi possível gerar as imagens. Tente um prompt diferente ou tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((img, index) => {
      setTimeout(() => {
        handleDownload(img.imageUrl, `ensaio-foto-${index + 1}.png`);
      }, index * 500);
    });
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto" data-testid="photoshoot-creator">
      <h1 className="text-3xl font-title text-[#CBC8C9] mb-4 border-b border-[#3A0A16] pb-2">
        Criar Ensaio Fotográfico
      </h1>
      <div className="space-y-4">
        <p className="text-[#CBC8C9]/80">
          Envie uma foto sua (opcional) e descreva o ensaio que você deseja criar. Serão geradas até {DAILY_LIMIT - dailyCount} fotos variadas.
        </p>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 bg-black/30 border-2 border-dashed border-[#3A0A16] rounded-lg flex items-center justify-center text-center text-xs text-[#CBC8C9]/70 cursor-pointer hover:border-[#53050B] flex-shrink-0"
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {baseImage ? (
              <img
                src={baseImage.preview}
                alt="Base"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center">
                <Camera className="w-8 h-8 mb-2" />
                <span>Enviar foto base</span>
              </div>
            )}
          </div>
          <div className="flex-grow space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: ensaio corporativo em escritório de luxo, estética elegante, luz natural suave, poses confiantes..."
              className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:outline-none focus:ring-2 focus:ring-[#53050B] resize-none"
              rows={3}
              disabled={isLoading}
            />
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#CBC8C9]/70">Quantidade:</label>
                <select
                  value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value))}
                  className="bg-[#19161B] border border-[#3A0A16] rounded-lg p-2 text-[#CBC8C9] focus:outline-none focus:ring-2 focus:ring-[#53050B]"
                  disabled={isLoading}
                >
                  <option value={5}>5 fotos</option>
                  <option value={10}>10 fotos</option>
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim() || dailyCount >= DAILY_LIMIT}
                className="px-6 py-2 bg-[#53050B] text-white rounded-lg font-semibold hover:bg-red-800 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Ensaio'
                )}
              </button>
              <span className="text-sm text-[#CBC8C9]/70 ml-auto whitespace-nowrap">
                {dailyCount}/{DAILY_LIMIT} usadas hoje
              </span>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="mt-6 p-6 bg-black/30 border border-[#3A0A16] rounded-lg">
          <p className="text-center text-lg mb-4">Gerando seu ensaio fotográfico...</p>
          <p className="text-center text-sm text-[#CBC8C9]/70">Isso pode levar alguns minutos. Por favor, aguarde.</p>
          <div className="mt-4 w-full bg-[#19161B] rounded-full h-2">
            <div className="bg-[#D4AF37] h-2 rounded-full animate-pulse" style={{ width: '50%' }}></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 text-red-400 text-center p-4 bg-red-900/20 border border-red-800 rounded-lg">
          {error}
        </div>
      )}

      {generatedImages.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-title text-[#CBC8C9]">
              Ensaio Gerado ({generatedImages.length} fotos)
            </h2>
            <button
              onClick={handleDownloadAll}
              className="px-4 py-2 bg-[#D4AF37] text-black rounded-lg font-semibold hover:bg-[#B8962E] transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Baixar Todas
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {generatedImages.map((img, index) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.imageUrl}
                  alt={`Foto ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border border-[#3A0A16] hover:border-[#53050B] transition-colors"
                />
                <button
                  onClick={() => handleDownload(img.imageUrl, `ensaio-foto-${index + 1}.png`)}
                  className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-[#53050B] transition-opacity opacity-0 group-hover:opacity-100"
                  aria-label="Baixar Imagem"
                >
                  <Download className="w-4 h-4" />
                </button>
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {index + 1}/{generatedImages.length}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && generatedImages.length === 0 && !error && (
        <div className="mt-6 flex-grow flex items-center justify-center bg-black/30 border border-[#3A0A16] rounded-lg">
          <p className="text-[#CBC8C9]/60">Seu ensaio fotográfico aparecerá aqui.</p>
        </div>
      )}
    </div>
  );
}