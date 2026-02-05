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

  const tabs = [
    { key: 'reels', label: 'Reels' },
    { key: 'carrossel', label: 'Carrossel' },
    { key: 'postEstatico', label: 'Post Estático' },
    { key: 'stories', label: 'Stories' },
    { key: 'ads', label: 'Criativos (ADS)' }
  ];

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
        <div className="text-center text-[#CBC8C9]/70 py-8">
          Buscando ideias estratégicas...
        </div>
      );
    }

    if (!themes || !themes[activeTab] || themes[activeTab].length === 0) {
      return (
        <div className="text-center text-[#CBC8C9]/50 py-8">
          Gere os temas para o seu nicho.
        </div>
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
    <div className="h-full flex flex-col bg-[#19161B]" data-testid="content-library">
      <div className="p-6">
        <div className="flex gap-4 items-center mb-4">
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
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="generate-themes-button"
          >
            Gerar Temas
          </button>
        </div>
        {error && (
          <p className="text-red-400 text-center mb-4" data-testid="error-message">{error}</p>
        )}
      </div>

      <div className="flex-1 flex gap-6 px-6 pb-6 overflow-hidden">
        <div className="w-1/2 flex flex-col border-2 border-[#53050B] rounded-lg overflow-hidden" data-testid="themes-panel">
          <div className="flex border-b-2 border-[#53050B] bg-black">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 p-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#53050B] text-white'
                    : 'text-[#CBC8C9]/70 hover:bg-[#3A0A16]/30'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-black/50">
            {renderThemesList()}
          </div>
        </div>

        <div className="w-1/2 flex flex-col border-2 border-[#53050B] rounded-lg overflow-hidden" data-testid="content-panel">
          <div className="border-b-2 border-[#53050B] p-4 bg-black flex justify-between items-center">
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

          <div className="flex-1 overflow-y-auto p-6 bg-black/50">
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
