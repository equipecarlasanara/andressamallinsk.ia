import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Heart } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Conselheira() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`conselheira_${Date.now()}`);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: 'Oi, leoa! Sou sua conselheira. Me conta o que está passando pela sua cabeça. Vou te dar minha opinião honesta, tá?'
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API}/ai/conselheira`,
        { message: userMessage, session_id: sessionId },
        getAuthHeaders()
      );
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (err) {
      console.error('Erro:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpa, tive um problema aqui. Pode repetir sua pergunta?' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#19161B]" data-testid="conselheira">
      <div className="border-b border-[#3A0A16] p-6">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-[#D4AF37]" />
          <div>
            <h1 className="text-3xl font-title text-[#CBC8C9]">A Conselheira</h1>
            <p className="text-sm text-[#CBC8C9]/70">Peça conselhos como se estivesse conversando com a Andressa</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
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
            <div className="bg-black/30 border border-[#D4AF37]/30 rounded-lg p-4">
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

      <div className="border-t border-[#3A0A16] p-4 bg-black">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Me conta o que está acontecendo..."
            className="flex-1 bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
            disabled={isLoading}
            data-testid="conselheira-input"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-[#D4AF37] hover:bg-[#B8962E] text-black px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
            data-testid="conselheira-send"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
