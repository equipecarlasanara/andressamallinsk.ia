import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Trash2 } from 'lucide-react';
// Build trigger: 2026-02-24T20:38

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const STORAGE_KEY = 'estrategista_chat_history';
const MAX_MESSAGES_TO_AI = 10; // Enviar apenas últimas 10 mensagens para economizar tokens

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const initialMessage = {
  role: 'assistant',
  content: 'Olá leoa! Vamos iniciar seu Diagnóstico Raio-X (40 pontos).\n\n1. Qual o seu nome e nicho exato que você atua?'
};

export default function EstrategistaDigital() {
  const [messages, setMessages] = useState([initialMessage]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const messagesEndRef = useRef(null);

  // Carregar histórico do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) setMessages(parsed);
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    }
  }, []);

  // Salvar histórico no localStorage
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClearHistory = () => {
    if (window.confirm('Deseja iniciar um novo ciclo estratégico? Isso apagará a conversa atual.')) {
      setMessages([initialMessage]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSendMessage = async (textOverride = null) => {
    const textToSend = textOverride || inputMessage.trim();
    if (!textToSend || isLoading) return;

    setInputMessage('');
    const newMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API}/ai/chat`,
        { message: textToSend, session_id: sessionId },
        getAuthHeaders()
      );
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data.response }
      ]);
    } catch (err) {
      console.error('Erro no chat:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Ops, tive um problema técnico. Pode repetir a última mensagem, Leoa?' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const lastMessage = messages[messages.length - 1];
  // Só mostrar opções se a IA finalizar o Raio-X com o resumo e o convite à ação
  const showOptions = !isLoading && lastMessage?.role === 'assistant' && (
    lastMessage.content.includes('deseja um conselho ou a ação') ||
    lastMessage.content.includes('DIAGNÓSTICO CONCLUÍDO')
  );

  return (
    <div className="h-full flex flex-col bg-[#19161B]" data-testid="estrategista-digital">
      <div className="border-b border-[#3A0A16] p-6 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 overflow-hidden">
            <img
              src="/logo_full.png"
              alt="A Estrategista"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
          </div>
        </div>
        <button
          onClick={handleClearHistory}
          className="text-[#CBC8C9]/30 hover:text-red-400 p-2 border border-white/5 rounded-full transition-all"
          title="Reiniciar Ciclo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide" data-testid="chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${index}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-5 shadow-xl ${message.role === 'user'
                ? 'bg-[#53050B] text-white rounded-tr-none'
                : 'bg-[#2A262D] border border-[#3A0A16] text-[#CBC8C9] rounded-tl-none font-light'
                }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</p>
            </div>
          </div>
        ))}

        {showOptions && (
          <div className="flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-bottom-2">
            <button
              onClick={() => handleSendMessage("Crie meu plano de ação de 30 dias para eu chegar ao meu faturamento ideal.")}
              className="bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold py-3 px-6 rounded-xl transition-all text-left flex justify-between items-center"
            >
              🚀 Criar meu Plano de Ações (30 dias)
              <span className="text-xs opacity-50">→</span>
            </button>
            <button
              onClick={() => handleSendMessage("Preciso de um conselho estratégico sobre um desafio atual.")}
              className="bg-transparent border border-[#3A0A16] hover:bg-[#3A0A16] text-[#CBC8C9] font-medium py-3 px-6 rounded-xl transition-all text-left flex justify-between items-center"
            >
              💡 Pedir um conselho
              <span className="text-xs opacity-50">→</span>
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2A262D] border border-[#3A0A16] rounded-2xl p-5 rounded-tl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 bg-gradient-to-t from-black to-transparent">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative group">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Digite aqui, Leoa..."
            className="w-full bg-[#2A262D] border border-[#3A0A16] rounded-2xl p-5 pr-14 text-[#CBC8C9] focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder:text-white/20 shadow-2xl"
            disabled={isLoading}
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#53050B] hover:bg-red-800 text-white p-3 rounded-xl transition-all disabled:opacity-30 flex items-center shadow-lg"
            data-testid="send-message-button"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[10px] text-center mt-3 text-[#CBC8C9]/30 tracking-widest uppercase">
          Estrategista Digital • 100% On-line
        </p>
      </div>
    </div>
  );
}