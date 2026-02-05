import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Eye, MessageCircle, DollarSign, TrendingDown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function SalesFunnel() {
  const [funnelData, setFunnelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFunnelData();
  }, []);

  const loadFunnelData = async () => {
    try {
      const response = await axios.get(`${API}/funnel/stats`, getAuthHeaders());
      setFunnelData(response.data);
    } catch (err) {
      console.error('Erro ao carregar funil:', err);
      // Dados mock para demonstração
      setFunnelData({
        topo: 1000,
        meio: 250,
        fundo: 50,
        conversao: 15,
        taxa_topo_meio: 25,
        taxa_meio_fundo: 20,
        taxa_fundo_conversao: 30
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-xl">Carregando...</p></div>;
  }

  const stages = [
    { id: 'topo', label: 'Topo do Funil', value: funnelData.topo, icon: Eye, color: 'from-blue-600 to-blue-400', description: 'Visitantes / Leads' },
    { id: 'meio', label: 'Meio do Funil', value: funnelData.meio, icon: MessageCircle, color: 'from-purple-600 to-purple-400', description: 'Em Contato / Interessados' },
    { id: 'fundo', label: 'Fundo do Funil', value: funnelData.fundo, icon: Users, color: 'from-yellow-600 to-yellow-400', description: 'Negociação' },
    { id: 'conversao', label: 'Conversão', value: funnelData.conversao, icon: DollarSign, color: 'from-green-600 to-green-400', description: 'Vendas Fechadas' }
  ];

  return (
    <div className="p-6 h-full overflow-y-auto bg-[#19161B]" data-testid="sales-funnel">
      <h1 className="text-4xl font-title text-[#CBC8C9] mb-6">Funil de Vendas</h1>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Visão Geral do Funil</h2>
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const width = (stage.value / funnelData.topo) * 100;
              const Icon = stage.icon;
              const nextStage = stages[index + 1];
              const conversionRate = nextStage 
                ? ((nextStage.value / stage.value) * 100).toFixed(1)
                : null;

              return (
                <div key={stage.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-[#D4AF37]" />
                      <h3 className="font-semibold">{stage.label}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#D4AF37]">{stage.value}</p>
                      <p className="text-xs text-[#CBC8C9]/60">{stage.description}</p>
                    </div>
                  </div>
                  
                  <div className="relative h-16 bg-[#19161B] rounded-lg overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${stage.color} flex items-center justify-center transition-all duration-500`}
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-white font-bold">{width.toFixed(0)}%</span>
                    </div>
                  </div>

                  {conversionRate && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      <p className="text-sm text-[#CBC8C9]/70">
                        Taxa de conversão: <span className="text-[#D4AF37] font-semibold">{conversionRate}%</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Taxa Topo → Meio</h3>
            <p className="text-3xl font-bold text-blue-400">{funnelData.taxa_topo_meio}%</p>
            <p className="text-xs text-[#CBC8C9]/60 mt-1">De visitantes para interessados</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Taxa Meio → Fundo</h3>
            <p className="text-3xl font-bold text-purple-400">{funnelData.taxa_meio_fundo}%</p>
            <p className="text-xs text-[#CBC8C9]/60 mt-1">De interessados para negociação</p>
          </div>

          <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Taxa Fundo → Venda</h3>
            <p className="text-3xl font-bold text-green-400">{funnelData.taxa_fundo_conversao}%</p>
            <p className="text-xs text-[#CBC8C9]/60 mt-1">De negociação para fechamento</p>
          </div>
        </div>

        <div className="mt-6 bg-black/30 border border-[#3A0A16] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-[#D4AF37]">Insights da Estrategista</h3>
          <ul className="space-y-2 text-sm text-[#CBC8C9]/90">
            <li>• <strong>Topo:</strong> {funnelData.topo < 500 ? 'Aumente tráfego com conteúdo estratégico e anúncios' : 'Tráfego bom! Foque em qualificação'}</li>
            <li>• <strong>Meio:</strong> {funnelData.taxa_topo_meio < 20 ? 'Taxa baixa. Revise sua oferta e mensagem' : 'Conversão saudável no meio do funil'}</li>
            <li>• <strong>Fundo:</strong> {funnelData.taxa_fundo_conversao < 25 ? 'GARGALO! Use Exterminador de Objeção para quebrar resistências' : 'Taxa de fechamento boa!'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
