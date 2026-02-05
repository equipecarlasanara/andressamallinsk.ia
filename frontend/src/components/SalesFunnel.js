import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, TrendingDown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const FunnelVisualizer = ({ stages }) => {
  if (!stages || stages.length === 0) return null;

  const maxLeads = stages[0]?.leads || 1;

  return (
    <div className="mb-6 p-4 bg-black/30 border border-[#3A0A16] rounded-lg">
      <h2 className="text-xl font-title text-center text-[#CBC8C9] mb-4">Visualização do Funil</h2>
      <div className="flex flex-col items-center space-y-2 px-4">
        {stages.map((stage, index) => {
          const widthPercentage = Math.max(30, (stage.leads / maxLeads) * 100);
          return (
            <div key={index}>
              <div
                className="bg-gradient-to-r from-[#3A0A16] to-[#53050B] p-3 rounded-md text-center shadow-lg transition-all duration-500 w-full"
                style={{ maxWidth: `${widthPercentage}%`, margin: '0 auto' }}
              >
                <h3 className="font-bold text-md text-white">{stage.name}</h3>
                <p className="text-xl font-semibold text-[#D4AF37]">{stage.leads.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-[#CBC8C9]/70">Leads</p>
              </div>
              {index < stages.length - 1 && stage.conversion && (
                <div className="flex flex-col items-center font-semibold text-white my-1">
                  <TrendingDown className="h-5 w-5 text-[#CBC8C9]/50" />
                  <span className="text-xs bg-[#19161B] px-2 py-0.5 rounded-full mt-1 border border-[#3A0A16]">
                    {stage.conversion}% Conversão
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function SalesFunnelBuilder() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`funnel_${Date.now()}`);
  const [funnelStages, setFunnelStages] = useState([]);
  const [metrics, setMetrics] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Mensagem inicial
    setMessages([{
      role: 'assistant',
      content: 'Leoa! Vamos construir seu funil de vendas estratégico. Para começar, me diga: qual é o seu produto/serviço principal, para quem você vende e qual o preço?'
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseFunnelData = (text) => {
    const stages = [];
    const lines = text.split('\n');
    
    let currentStage = null;
    let newMetrics = {};
    
    for (const line of lines) {
      // Detectar início de estágio (### ou **)
      if (line.startsWith('###') || (line.startsWith('**') && !line.includes('Ações') && !line.includes('Leads') && !line.includes('Conversão'))) {
        if (currentStage && currentStage.leads > 0) stages.push(currentStage);
        const stageName = line.replace(/[#*]/g, '').trim();
        if (stageName && !stageName.toLowerCase().includes('métrica')) {
          currentStage = { name: stageName, leads: 0, conversion: 0, actions: '' };
        }
      } else if (currentStage) {
        // Extrair leads - múltiplos padrões
        const leadsPatterns = [
          /\*\*Leads:\*\*\s*(\d+)/i,
          /Leads:\s*(\d+)/i,
          /(\d+)\s*leads/i
        ];
        for (const pattern of leadsPatterns) {
          const match = line.match(pattern);
          if (match) {
            currentStage.leads = parseInt(match[1]);
            break;
          }
        }
        
        // Extrair conversão - múltiplos padrões
        const convPatterns = [
          /\*\*Conversão:\*\*\s*(\d+)%/i,
          /Conversão:\s*(\d+)%/i,
          /(\d+)%\s*(?:de\s*)?convers[aã]o/i
        ];
        for (const pattern of convPatterns) {
          const match = line.match(pattern);
          if (match) {
            currentStage.conversion = parseInt(match[1]);
            break;
          }
        }
        
        // Extrair ações
        const actionsMatch = line.match(/\*\*Ações:\*\*\s*(.+)/i) || line.match(/Ações:\s*(.+)/i);
        if (actionsMatch) {
          currentStage.actions = actionsMatch[1].replace(/[\[\]]/g, '').trim();
        }
      }
      
      // Extrair métricas globais
      if (line.includes('Custo por Lead') || line.includes('CPL')) {
        const cplMatch = line.match(/R\$\s*([\d.,]+)/);
        if (cplMatch) newMetrics.cpl = parseFloat(cplMatch[1].replace('.', '').replace(',', '.'));
      }
      if (line.includes('Lifetime Value') || line.includes('LTV')) {
        const ltvMatch = line.match(/R\$\s*([\d.,]+)/);
        if (ltvMatch) newMetrics.ltv = parseFloat(ltvMatch[1].replace('.', '').replace(',', '.'));
      }
    }
    
    // Adicionar último estágio
    if (currentStage && currentStage.leads > 0) stages.push(currentStage);
    
    // Atualizar estado se encontrou dados válidos
    if (stages.length > 0) {
      setFunnelStages(stages);
    }
    if (Object.keys(newMetrics).length > 0) {
      setMetrics(m => ({ ...m, ...newMetrics }));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API}/ai/build-funnel`,
        { message: userMessage, session_id: sessionId },
        getAuthHeaders()
      );
      
      const aiResponse = response.data.response;
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      parseFunnelData(aiResponse);
    } catch (err) {
      console.error('Erro:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#19161B]" data-testid="funnel-builder">
      <div className="border-b border-[#3A0A16] p-6">
        <h1 className="text-3xl font-title text-[#CBC8C9]">Construtor de Funil de Vendas</h1>
        <p className="text-sm text-[#CBC8C9]/70 mt-2">Construa seu funil estratégico com a metodologia da Estrategista</p>
      </div>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        <div className="w-1/2 flex flex-col border-2 border-[#53050B] rounded-lg overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-[#53050B] text-white'
                      : 'bg-black/30 border border-[#3A0A16] text-[#CBC8C9]'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-4">
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

          <div className="border-t-2 border-[#53050B] p-4 bg-black">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Responda aqui..."
                className="flex-1 bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:outline-none focus:ring-2 focus:ring-[#53050B]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-[#53050B] hover:bg-red-800 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        <div className="w-1/2 overflow-y-auto">
          <FunnelVisualizer stages={funnelStages} />
          
          {metrics.cpl && metrics.ltv && (
            <div className="p-4 bg-black/30 border border-[#3A0A16] rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-[#D4AF37]">Métricas de Desempenho</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#CBC8C9]/70">Custo por Lead (CPL)</p>
                  <p className="text-2xl font-bold text-white">R$ {metrics.cpl?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#CBC8C9]/70">Lifetime Value (LTV)</p>
                  <p className="text-2xl font-bold text-green-400">R$ {metrics.ltv?.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
