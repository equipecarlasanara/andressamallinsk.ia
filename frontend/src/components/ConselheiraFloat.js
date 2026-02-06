import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Heart, X, Minimize2, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const STORAGE_KEY = 'conselheira_chat_history';
const MAX_MESSAGES_TO_AI = 10;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const initialMessage = {
  role: 'assistant',
  content: 'Oi, leoa! Sou a Andressa. Me conta o que está passando pela sua cabeça. Vou te dar minha opinião honesta, tá?'
};

export default function ConselheiraFloat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([initialMessage]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`conselheira_${Date.now()}`);
  const [unreadCount, setUnreadCount] = useState(0);
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

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen, isMinimized]);

  const handleClearHistory = () => {
    setMessages([initialMessage]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API}/ai/conselheira`,
        { message: userMessage, session_id: sessionId },
        getAuthHeaders()
      );
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      if (isMinimized) setUnreadCount(prev => prev + 1);
    } catch (err) {
      console.error('Erro:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpa, tive um problema aqui. Pode repetir?' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#D4AF37] hover:bg-[#B8962E] rounded-full flex items-center justify-center shadow-lg z-50 transition-transform hover:scale-110"
        data-testid="conselheira-float-button"
      >
        <Heart className="w-7 h-7 text-black" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 bg-[#D4AF37] hover:bg-[#B8962E] rounded-full flex items-center justify-center shadow-lg relative transition-transform hover:scale-110"
        >
          <Heart className="w-7 h-7 text-black" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-[#19161B] border border-[#3A0A16] rounded-lg shadow-2xl z-50 flex flex-col" data-testid="conselheira-float">
      <div className="flex items-center justify-between p-3 border-b border-[#3A0A16] bg-black/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#D4AF37]" />
          <span className="font-semibold text-[#CBC8C9]">A Conselheira</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 1 && (
            <button onClick={handleClearHistory} className="p-1 hover:bg-[#3A0A16]/50 rounded" title="Limpar histórico">
              <Trash2 className="w-4 h-4 text-[#CBC8C9]/50 hover:text-red-400" />
            </button>
          )}
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-[#3A0A16]/50 rounded">
            <Minimize2 className="w-4 h-4 text-[#CBC8C9]" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-[#3A0A16]/50 rounded">
            <X className="w-4 h-4 text-[#CBC8C9]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm ${
                message.role === 'user'
                  ? 'bg-[#53050B] text-white'
                  : 'bg-black/30 border border-[#D4AF37]/30 text-[#CBC8C9]'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-black/30 border border-[#D4AF37]/30 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 border-t border-[#3A0A16] bg-black/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Me conta..."
            className="flex-1 bg-[#19161B] border border-[#3A0A16] rounded-lg px-3 py-2 text-sm text-[#CBC8C9] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-[#D4AF37] hover:bg-[#B8962E] text-black px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
