import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function EstrategistaDigital() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! Sou a Estrategista Digital, sua mentora de negócios. Estou aqui para ajudá-la a estruturar e escalar seu negócio com foco em resultados financeiros. Como posso ajudar você hoje?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages([...messages, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API}/ai/chat`,
        { message: userMessage, session_id: sessionId },
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
        { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="estrategista-digital">
      <div className="border-b border-[#3A0A16] p-6">
        <h1 className="text-3xl font-title text-[#CBC8C9]" data-testid="chat-title">
          Estrategista Digital
        </h1>
        <p className="text-sm text-[#CBC8C9]/70 mt-2">
          Sua mentora de negócios impulsionada por IA
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
            data-testid={`message-${index}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-[#53050B] text-white'
                  : 'bg-black/30 border border-[#3A0A16] text-[#CBC8C9]'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start" data-testid="loading-indicator">
            <div className="max-w-[70%] rounded-lg p-4 bg-black/30 border border-[#3A0A16]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#3A0A16] p-4">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:outline-none focus:ring-2 focus:ring-[#53050B]"
            disabled={isLoading}
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-[#53050B] hover:bg-red-800 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            data-testid="send-message-button"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}