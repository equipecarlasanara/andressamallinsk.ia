import { useState } from 'react';
import axios from 'axios';
import { Sparkles, Save } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function ContentLibrary() {
  const [niche, setNiche] = useState('');
  const [themes, setThemes] = useState(null);
  const [activeTab, setActiveTab] = useState('reels');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [content, setContent] = useState('');
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState('');

  const tabs = ['reels', 'carrossel', 'postEstatico', 'stories', 'ads'];
  const tabLabels = {
    reels: 'Reels',
    carrossel: 'Carrossel',
    postEstatico: 'Post Estático',
    stories: 'Stories',
    ads: 'Criativos (ADS)'
  };

  const handleGenerateThemes = async () => {
    if (!niche.trim()) return;
    setIsLoadingThemes(true);
    setThemes(null);
    setSelectedTheme(null);
    setContent('');
    setError('');

    try {
      const response = await axios.post(
        `${API}/ai/generate-themes`,
        { niche },
        getAuthHeaders()
      );
      setThemes(response.data);
    } catch (err) {
      setError('Não foi possível gerar os temas. Tente novamente.');
      console.error('Erro ao gerar temas:', err);
    } finally {
      setIsLoadingThemes(false);
    }
  };

  const handleGenerateContent = async (theme) => {
    setSelectedTheme({ theme, type: activeTab });
    setIsLoadingContent(true);
    setContent('');
    setError('');

    try {
      const response = await axios.post(
        `${API}/ai/generate-content`,
        {
          title: theme.title,
          description: theme.description,
          content_type: activeTab,
          niche
        },
        getAuthHeaders()
      );
      setContent(response.data.content);
    } catch (err) {
      setError('Não foi possível gerar o conteúdo para este tema.');
      console.error('Erro ao gerar conteúdo:', err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSaveContent = async () => {
    if (!selectedTheme || !content) return;

    try {
      await axios.post(
        `${API}/content`,
        {
          title: selectedTheme.theme.title,
          content_type: selectedTheme.type,
          theme: niche,
          description: selectedTheme.theme.description,
          generated_content: content
        },
        getAuthHeaders()
      );
      alert('Conteúdo salvo com sucesso!');
    } catch (err) {
      alert('Erro ao salvar conteúdo');
      console.error('Erro ao salvar:', err);
    }
  };

  const renderThemesList = () => {
    if (isLoadingThemes) {
      return (
        <p className="text-center text-[#CBC8C9]/70" data-testid="loading-themes">
          Buscando ideias estratégicas...
        </p>
      );
    }

    if (!themes || !themes[activeTab]) {
      return (
        <p className="text-center text-[#CBC8C9]/50 mt-8" data-testid="no-themes-message">
          Gere os temas para o seu nicho.
        </p>
      );
    }

    const currentThemes = themes[activeTab];
    const themeItems = [];
    
    for (let i = 0; i < currentThemes.length; i++) {
      const theme = currentThemes[i];
      const isSelected = selectedTheme && 
        selectedTheme.theme.title === theme.title && 
        selectedTheme.type === activeTab;
      
      themeItems.push(
        <button
          key={`${activeTab}-${i}`}
          onClick={() => handleGenerateContent(theme)}
          className={`w-full text-left p-4 rounded-md transition-colors ${
            isSelected
              ? 'bg-[#3A0A16] border border-[#D4AF37]'
              : 'bg-black/20 hover:bg-[#3A0A16]/50 border border-transparent'
          }`}
          data-testid={`theme-item-${i}`}
        >
          <h3 className="font-semibold text-white text-sm mb-1">{theme.title}</h3>
          <p className="text-xs text-[#CBC8C9]/70">{theme.description}</p>
        </button>
      );
    }

    return <div className="space-y-2">{themeItems}</div>;
  };

  return (
    <div className="h-full flex flex-col" data-testid="content-library">
      <div className="border-b border-[#3A0A16] p-6">
        <h1 className="text-3xl font-title text-[#CBC8C9] mb-4" data-testid="library-title">
          Biblioteca de Conteúdo
        </h1>
        <div className="flex gap-4">
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Digite seu nicho de mercado"
            className="flex-grow bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:outline-none focus:ring-2 focus:ring-[#53050B]"
            disabled={isLoadingThemes}
            data-testid="niche-input"
          />
          <button
            onClick={handleGenerateThemes}
            disabled={isLoadingThemes || !niche.trim()}
            className="flex items-center px-6 py-2 bg-[#53050B] text-white rounded-lg font-semibold hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="generate-themes-button"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isLoadingThemes ? 'Gerando...' : 'Gerar Temas'}
          </button>
        </div>
        {error && (
          <p className="text-red-400 text-center mt-4" data-testid="error-message">{error}</p>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/5 border-r border-[#3A0A16] flex flex-col" data-testid="themes-panel">
          <div className="flex border-b border-[#3A0A16]">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 p-3 text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? 'bg-[#3A0A16] text-white border-b-2 border-[#D4AF37]'
                    : 'text-[#CBC8C9]/70 hover:bg-[#3A0A16]/30'
                }`}
                data-testid={`tab-${tab}`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {renderThemesList()}
          </div>
        </div>

        <div className="flex-1 flex flex-col" data-testid="content-panel">
          <div className="border-b border-[#3A0A16] p-4 flex justify-between items-center">
            <h2 className="text-xl font-title text-[#CBC8C9]" data-testid="content-title">
              Roteiro do Conteúdo
            </h2>
            {content && (
              <button
                onClick={handleSaveContent}
                className="flex items-center px-4 py-2 bg-[#D4AF37] text-[#19161B] rounded-lg font-semibold hover:bg-[#D4AF37]/80 transition-colors"
                data-testid="save-content-button"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingContent && (
              <p className="text-center text-[#CBC8C9]/70" data-testid="loading-content">
                Criando roteiro...
              </p>
            )}
            {content && !isLoadingContent && (
              <div className="text-[#CBC8C9]/90 whitespace-pre-wrap leading-relaxed" data-testid="generated-content">
                {content}
              </div>
            )}
            {!content && !isLoadingContent && (
              <p className="text-center text-[#CBC8C9]/50 mt-16" data-testid="no-content-message">
                Selecione um tema à esquerda para ver o roteiro aqui.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
