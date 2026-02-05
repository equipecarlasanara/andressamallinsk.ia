import { useState, useRef } from 'react';
import axios from 'axios';
import { Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function ImageEditor() {
  const [prompt, setPrompt] = useState('');
  const [originalImage, setOriginalImage] = useState(null);
  const [editedImageUrl, setEditedImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalImage({ file, preview: URL.createObjectURL(file) });
      setEditedImageUrl(null);
      setError(null);
      setPrompt('');
    }
  };

  const handleEdit = async () => {
    if (!prompt.trim() || !originalImage) return;
    setIsLoading(true);
    setEditedImageUrl(null);
    setError(null);

    try {
      const reader = new FileReader();
      const imagePayload = await new Promise((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve({ base64, mimeType: originalImage.file.type });
        };
        reader.readAsDataURL(originalImage.file);
      });

      const response = await axios.post(
        `${API}/ai/edit-image`,
        { prompt, image: imagePayload },
        getAuthHeaders()
      );
      setEditedImageUrl(response.data.imageUrl);
    } catch (err) {
      console.error('Erro ao editar imagem:', err);
      setError('Não foi possível editar a imagem. Tente um prompt diferente ou tente novamente mais tarde.');
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
    <div className="p-6 h-full flex flex-col" data-testid="image-editor">
      <h1 className="text-3xl font-title text-[#CBC8C9] mb-4 border-b border-[#3A0A16] pb-2">
        Editor Nano Banana
      </h1>
      <p className="text-[#CBC8C9]/80 mb-4">
        Envie uma imagem e use comandos de texto para editá-la. Ex: "Adicione um filtro retrô" ou "Remova a pessoa no fundo".
      </p>

      {!originalImage && !isLoading && (
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
            <p className="mb-4 text-[#CBC8C9]/70">Clique para enviar uma imagem para editar.</p>
            <button className="px-6 py-2 bg-[#53050B] text-white rounded-lg font-semibold hover:bg-red-800 pointer-events-none">
              Enviar Imagem
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col flex-grow items-center justify-center">
          <div className="w-32 h-32 border-8 border-gray-200 border-t-[#53050B] rounded-full animate-spin"></div>
          <p className="mt-4 text-lg">Editando imagem com Nano Banana...</p>
        </div>
      )}

      {originalImage && !isLoading && (
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: cacheie meu cabelo e me coloque sentada"
              className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:outline-none focus:ring-2 focus:ring-[#53050B] resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleEdit}
              disabled={isLoading || !prompt.trim()}
              className="px-6 py-3 bg-[#53050B] text-white rounded-lg font-semibold hover:bg-red-800 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Editar
            </button>
          </div>

          {error && <p className="text-red-400 text-center mb-4">{error}</p>}

          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-auto p-1">
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-title text-center mb-2">Original</h2>
              <img
                src={originalImage.preview}
                alt="Original"
                className="w-full max-w-md object-contain rounded-lg border border-[#3A0A16]"
              />
            </div>
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-title text-center mb-2">Editada</h2>
              <div className="relative group w-full max-w-md aspect-square flex items-center justify-center bg-black/20 border border-[#53050B] rounded-lg">
                {editedImageUrl ? (
                  <>
                    <img
                      src={editedImageUrl}
                      alt="Editada"
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                    <button
                      onClick={() => handleDownload(editedImageUrl, 'imagem-editada.png')}
                      className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-[#53050B] transition-opacity opacity-0 group-hover:opacity-100"
                      aria-label="Baixar Imagem"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <p className="text-[#CBC8C9]/60 p-4 text-center">Sua imagem editada aparecerá aqui.</p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setOriginalImage(null)}
            className="mt-4 mx-auto px-6 py-2 bg-[#19161B] border border-[#3A0A16] text-white rounded-lg font-semibold hover:bg-[#3A0A16]"
          >
            Enviar Outra Imagem
          </button>
        </div>
      )}
    </div>
  );
}