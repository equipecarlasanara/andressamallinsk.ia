import { useState, useRef } from 'react';
import axios from 'axios';
import { Download, Camera } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DAILY_LIMIT = 20;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function PhotoshootCreator() {
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState('1K');
  const [baseImage, setBaseImage] = useState(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
    if (!prompt.trim() || dailyCount >= DAILY_LIMIT) {
      if (dailyCount >= DAILY_LIMIT) {
        setError('Você atingiu o limite de 20 imagens por dia. Tente novamente amanhã.');
      }
      return;
    }
    setIsLoading(true);
    setGeneratedImageUrl(null);
    setError(null);

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
        { prompt, imageSize, baseImage: imagePayload },
        getAuthHeaders()
      );
      setGeneratedImageUrl(response.data.imageUrl);
      setDailyCount(dailyCount + 1);
    } catch (err) {
      console.error('Erro ao gerar ensaio:', err);
      setError('Não foi possível gerar a imagem. Tente um prompt diferente ou tente novamente mais tarde.');
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

  return (
    <div className="p-6 h-full flex flex-col" data-testid="photoshoot-creator">
      <h1 className="text-3xl font-title text-[#CBC8C9] mb-4 border-b border-[#3A0A16] pb-2">
        Criar Ensaio Fotográfico
      </h1>
      <div className="space-y-4">
        <p className="text-[#CBC8C9]/80">
          Envie uma foto sua (opcional) e descreva a cena, o estilo, as cores e a estética do ensaio que você deseja criar.
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
              placeholder="Ex: transforme esta foto em um retrato corporativo com fundo de escritório de luxo, estética Gucci, cores escuras..."
              className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:outline-none focus:ring-2 focus:ring-[#53050B] resize-none"
              rows={3}
              disabled={isLoading}
            />
            <div className="flex gap-4 items-center">
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                className="bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:outline-none focus:ring-2 focus:ring-[#53050B]"
                disabled={isLoading}
              >
                <option value="1K">1K</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>
              <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim() || dailyCount >= DAILY_LIMIT}
                className="px-6 py-2 bg-[#53050B] text-white rounded-lg font-semibold hover:bg-red-800 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Gerando...' : 'Gerar Imagem'}
              </button>
              <span className="text-sm text-[#CBC8C9]/70 ml-auto whitespace-nowrap">
                {dailyCount}/{DAILY_LIMIT} por dia
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex-grow flex items-center justify-center bg-black/30 border border-[#3A0A16] rounded-lg relative group">
        {isLoading && (
          <div className="w-32 h-32 border-8 border-gray-200 border-t-[#53050B] rounded-full animate-spin"></div>
        )}
        {error && <p className="text-red-400 text-center p-4">{error}</p>}
        {generatedImageUrl && (
          <>
            <img
              src={generatedImageUrl}
              alt="Generated Photoshoot"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => handleDownload(generatedImageUrl, 'ensaio-gerado.png')}
              className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-[#53050B] transition-opacity opacity-0 group-hover:opacity-100"
              aria-label="Baixar Imagem"
            >
              <Download className="w-6 h-6" />
            </button>
          </>
        )}
        {!isLoading && !error && !generatedImageUrl && (
          <p className="text-[#CBC8C9]/60">Sua imagem aparecerá aqui.</p>
        )}
      </div>
    </div>
  );
}