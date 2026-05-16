import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Send, Trash2, Upload, FileText, X, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const initialMessage = {
  role: 'assistant',
  content: 'Olá leoa! 👋\n\nPara eu te ajudar de forma personalizada, faça o upload do seu Plano de Ação Individual (PDF) clicando no botão "Plano de Ação" acima.\n\nSe já enviou antes, pode ir direto ao ponto — estou aqui!'
};

export default function EstrategistaDigital() {
  const [messages, setMessages] = useState([initialMessage]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const [actionPlan, setActionPlan] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadActionPlan = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/action-plan`, getAuthHeaders());
      if (res.data) setActionPlan(res.data);
    } catch (e) {}
  }, []);

  useEffect(() => { loadActionPlan(); }, [loadActionPlan]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePlanUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo PDF.');
      return;
    }
    setUploadLoading(true);
    setUploadSuccess(false);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await axios.post(
        `${API}/action-plan`,
        { filename: file.name, content: base64, is_pdf: true },
        getAuthHeaders()
      );
      setActionPlan({ filename: file.name, uploaded_at: res.data.uploaded_at });
      setUploadSuccess(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Recebi seu Plano de Ação Individual — ${file.name}!\n\nJá li todo o seu material. Agora consigo te ajudar de forma totalmente personalizada.\n\nA partir desse plano, gostaria de receber as ações desta semana?`
      }]);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao enviar o plano. Tente novamente.');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePlan = async () => {
    if (!window.confirm('Deseja remover o Plano de Ação atual?')) return;
    try {
      await axios.delete(`${API}/action-plan`, getAuthHeaders());
      setActionPlan(null);
    } catch (e) { alert('Erro ao remover plano.'); }
  };

  const handleSendMessage = async (textOverride = null) => {
    const textToSend = textOverride || inputMessage.trim();
    if (!textToSend || isLoading) return;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API}/ai/chat`,
        { message: textToSend, session_id: sessionId },
        getAuthHeaders()
      );
      const aiResponse = response.data.response;
      const cleanResponse = aiResponse.replace(/PROJETAR_TAREFA:.*$/gm, '').trim();
      setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
      if (aiResponse.includes('PROJETAR_TAREFA:')) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Suas acoes da semana foram adicionadas ao Dashboard de Metas! Acesse la para acompanhar seu progresso.'
          }]);
        }, 1000);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ops, tive um problema técnico. Pode repetir a última mensagem, Leoa?'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Deseja iniciar um novo ciclo estratégico? Isso apagará a conversa atual.')) {
      setMessages([initialMessage]);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showWeeklyActionsOffer = !isLoading &&
    lastMessage?.role === 'assistant' &&
    lastMessage.content.includes('ações desta semana');

  return (
    <div className="h-full flex flex-col bg-[#19161B]" data-testid="estrategista-digital">
      <div className="border-b border-[#3A0A16] p-4 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/logo_full.png" alt="" className="w-10 h-20 object-cover object-top" style={{ transform: 'translateY(4px)' }} />
          </div>
          <p className="text-xs text-[#CBC8C9]/50">by Andressa Mallinsk</p>
        </div>
        <div className="flex items-center gap-2">
          {actionPlan ? (
            <div className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg px-3 py-1.5">
              <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[#D4AF37] text-xs font-medium truncate max-w-[120px]">{actionPlan.filename}</span>
              <button onClick={handleRemovePlan} className="text-[#D4AF37]/50 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="flex items-center gap-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            >
              {uploadLoading ? (
                <div className="w-3.5 h-3.5 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              ) : uploadSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
              {uploadLoading ? 'Enviando...' : uploadSuccess ? 'Enviado!' : 'Plano de Ação'}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handlePlanUpload} className="hidden" />
          <button onClick={handleClearHistory} className="text-[#CBC8C9]/30 hover:text-red-400 p-2 border border-white/5 rounded-full transition-all" title="Reiniciar Ciclo">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6" data-testid="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-5 shadow-xl ${message.role === 'user' ? 'bg-[#53050B] text-white rounded-tr-none' : 'bg-[#2A262D] border border-[#3A0A16] text-[#CBC8C9] rounded-tl-none font-light'}`}>
              <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</p>
            </div>
          </div>
        ))}

        {showWeeklyActionsOffer && (
          <div className="flex flex-col gap-3 mt-2">
            <button onClick={() => handleSendMessage("Sim! Quero receber as ações desta semana baseadas no meu plano de ação.")}
              className="bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold py-3 px-6 rounded-xl transition-all text-left flex justify-between items-center">
              Sim! Quero as ações da semana <span className="text-xs opacity-50">→</span>
            </button>
            <button onClick={() => handleSendMessage("Prefiro conversar sobre uma dúvida estratégica primeiro.")}
              className="bg-transparent border border-[#3A0A16] hover:bg-[#3A0A16] text-[#CBC8C9] font-medium py-3 px-6 rounded-xl transition-all text-left flex justify-between items-center">
              Prefiro tirar uma dúvida primeiro <span className="text-xs opacity-50">→</span>
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2A262D] border border-[#3A0A16] rounded-2xl rounded-tl-none p-5">
              <div className="flex gap-1.5">
                {[0, 150, 300].map(delay => (
                  <div key={delay} className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#3A0A16] p-4 bg-black/20">
        <div className="flex gap-3 items-end">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder={actionPlan ? "Fale com a Estrategista..." : "Envie seu Plano de Ação ou escreva sua dúvida..."}
            rows={1}
            className="flex-1 bg-[#2A262D] border border-[#3A0A16] rounded-xl px-4 py-3 text-[#CBC8C9] placeholder-[#CBC8C9]/30 resize-none focus:outline-none focus:border-[#D4AF37]/50 transition-colors text-sm"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button onClick={() => handleSendMessage()} disabled={!inputMessage.trim() || isLoading}
            className="bg-[#D4AF37] hover:bg-[#B8962E] disabled:opacity-30 disabled:cursor-not-allowed text-black p-3 rounded-xl transition-all flex-shrink-0">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
