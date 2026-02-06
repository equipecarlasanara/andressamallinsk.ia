import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, DollarSign, CheckCircle, Plus, Edit2, Trash2, X, Calendar, User } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const getCurrentWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
};

const KANBAN_STAGES = [
  { id: 'novo', label: 'Novo Lead', color: 'bg-blue-900/30 border-blue-500' },
  { id: 'contato', label: 'Em Contato', color: 'bg-yellow-900/30 border-yellow-500' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-purple-900/30 border-purple-500' },
  { id: 'fechado', label: 'Fechado', color: 'bg-green-900/30 border-green-500' }
];

export default function GoalsDashboard() {
  const [currentGoal, setCurrentGoal] = useState(null);
  const [weeklyActions, setWeeklyActions] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showActionDetail, setShowActionDetail] = useState(null);
  const [showLeadDetail, setShowLeadDetail] = useState(null);
  const [goalForm, setGoalForm] = useState({ monthly_target: '', current_revenue: '' });
  const [actionForm, setActionForm] = useState({ title: '', description: '' });
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', stage: 'novo', notes: '', followup_date: '' });

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentMonth = monthNames[new Date().getMonth()];
  const currentYear = new Date().getFullYear();
  const weekStart = getCurrentWeekStart();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [goalRes, actionsRes, leadsRes] = await Promise.all([
        axios.get(`${API}/goals/current`, getAuthHeaders()),
        axios.get(`${API}/weekly-actions?week_start=${weekStart}`, getAuthHeaders()),
        axios.get(`${API}/leads`, getAuthHeaders())
      ]);
      setCurrentGoal(goalRes.data);
      setWeeklyActions(actionsRes.data);
      setLeads(leadsRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      const response = await axios.post(
        `${API}/goals`,
        {
          monthly_target: parseFloat(goalForm.monthly_target),
          current_revenue: parseFloat(goalForm.current_revenue || 0),
          month: currentMonth,
          year: currentYear
        },
        getAuthHeaders()
      );
      setCurrentGoal(response.data);
      setShowGoalModal(false);
      setGoalForm({ monthly_target: '', current_revenue: '' });
    } catch (err) {
      alert('Erro ao criar meta: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateGoal = async () => {
    try {
      const response = await axios.patch(
        `${API}/goals/${currentGoal.id}`,
        {
          monthly_target: parseFloat(goalForm.monthly_target),
          current_revenue: parseFloat(goalForm.current_revenue)
        },
        getAuthHeaders()
      );
      setCurrentGoal(response.data);
      setShowGoalModal(false);
      setGoalForm({ monthly_target: '', current_revenue: '' });
    } catch (err) {
      alert('Erro ao atualizar meta: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCreateAction = async () => {
    try {
      const response = await axios.post(
        `${API}/weekly-actions`,
        { ...actionForm, week_start: weekStart },
        getAuthHeaders()
      );
      setWeeklyActions([...weeklyActions, response.data]);
      setShowActionModal(false);
      setActionForm({ title: '', description: '' });
    } catch (err) {
      alert('Erro ao criar ação: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleAction = async (action) => {
    try {
      const response = await axios.patch(
        `${API}/weekly-actions/${action.id}`,
        { completed: !action.completed },
        getAuthHeaders()
      );
      setWeeklyActions(weeklyActions.map(a => a.id === action.id ? response.data : a));
    } catch (err) {
      console.error('Erro ao atualizar ação:', err);
    }
  };

  const handleDeleteAction = async (actionId) => {
    if (!window.confirm('Deseja remover esta ação?')) return;
    try {
      await axios.delete(`${API}/weekly-actions/${actionId}`, getAuthHeaders());
      setWeeklyActions(weeklyActions.filter(a => a.id !== actionId));
    } catch (err) {
      console.error('Erro ao deletar ação:', err);
    }
  };

  const handleCreateLead = async () => {
    try {
      const response = await axios.post(`${API}/leads`, leadForm, getAuthHeaders());
      setLeads([...leads, response.data]);
      setShowLeadModal(false);
      setLeadForm({ name: '', phone: '', stage: 'novo', notes: '', followup_date: '' });
    } catch (err) {
      alert('Erro ao criar lead: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateLeadStage = async (leadId, newStage) => {
    try {
      const response = await axios.patch(`${API}/leads/${leadId}`, { stage: newStage }, getAuthHeaders());
      setLeads(leads.map(l => l.id === leadId ? response.data : l));
    } catch (err) {
      console.error('Erro ao atualizar lead:', err);
    }
  };

  const openEditGoal = () => {
    setGoalForm({
      monthly_target: currentGoal?.monthly_target || '',
      current_revenue: currentGoal?.current_revenue || ''
    });
    setShowGoalModal(true);
  };

  const progressPercentage = currentGoal
    ? Math.min((currentGoal.current_revenue / currentGoal.monthly_target) * 100, 100)
    : 0;

  const remainingAmount = currentGoal
    ? Math.max(currentGoal.monthly_target - currentGoal.current_revenue, 0)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-state">
        <p className="text-xl">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto bg-[#19161B]" data-testid="goals-dashboard">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-title text-[#CBC8C9] mb-6" data-testid="dashboard-title">
          Dashboard de Metas
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#3A0A16] to-black border border-[#53050B] rounded-lg p-4" data-testid="goal-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm font-semibold">Meta Mensal</h3>
              </div>
              {currentGoal && (
                <button onClick={openEditGoal} className="p-1 hover:bg-[#3A0A16]/50 rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-2xl font-bold" style={{ color: '#D4AF37' }}>
              R$ {currentGoal?.monthly_target?.toLocaleString('pt-BR') || '0'}
            </p>
            <p className="text-xs text-[#CBC8C9]/60 mt-1">{currentMonth} {currentYear}</p>
            {!currentGoal && (
              <button onClick={() => setShowGoalModal(true)} className="mt-2 w-full bg-[#53050B] hover:bg-red-800 text-white text-xs py-1 rounded">
                Definir Meta
              </button>
            )}
          </div>

          <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <h3 className="text-sm font-semibold">Faturamento Atual</h3>
            </div>
            <p className="text-2xl font-bold text-green-500">
              R$ {currentGoal?.current_revenue?.toLocaleString('pt-BR') || '0'}
            </p>
            <p className="text-xs text-[#CBC8C9]/60 mt-1">{progressPercentage.toFixed(0)}% da meta</p>
          </div>

          <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-semibold">Falta</h3>
            </div>
            <p className="text-2xl font-bold text-red-400">
              R$ {remainingAmount.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-[#CBC8C9]/60 mt-1">Para atingir a meta</p>
          </div>

          <div className="bg-gradient-to-br from-[#3A0A16] to-black border border-[#53050B] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="text-sm font-semibold">Ações Concluídas</h3>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#D4AF37' }}>
              {weeklyActions.filter(a => a.completed).length} / {weeklyActions.length}
            </p>
            <p className="text-xs text-[#CBC8C9]/60 mt-1">Esta semana</p>
          </div>
        </div>

        {currentGoal && (
          <div className="mb-6 bg-black/30 border border-[#3A0A16] rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Progresso da Meta</h3>
            <div className="w-full bg-[#19161B] rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-600 to-green-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-title text-[#CBC8C9]">Ações da Semana</h2>
              <button onClick={() => setShowActionModal(true)} className="flex items-center bg-[#53050B] hover:bg-red-800 text-white px-3 py-1 rounded text-sm">
                <Plus className="w-4 h-4 mr-1" />
                Nova
              </button>
            </div>

            {weeklyActions.length === 0 ? (
              <p className="text-center text-[#CBC8C9]/50 py-4 text-sm">Nenhuma ação cadastrada</p>
            ) : (
              <div className="space-y-2">
                {weeklyActions.slice(0, 5).map((action) => (
                  <div 
                    key={action.id} 
                    className="flex items-start gap-2 p-2 bg-[#19161B] border border-[#3A0A16] rounded hover:border-[#53050B]/50 cursor-pointer"
                    onClick={() => setShowActionDetail(action)}
                  >
                    <button onClick={(e) => { e.stopPropagation(); handleToggleAction(action); }} className="mt-1">
                      {action.completed ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-[#3A0A16] rounded-full"></div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm ${action.completed ? 'line-through text-[#CBC8C9]/50' : 'text-[#CBC8C9]'}`}>
                        {action.title}
                      </h4>
                      {action.description && (
                        <p className="text-xs text-[#CBC8C9]/50 truncate">{action.description}</p>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAction(action.id); }} className="p-1 hover:bg-[#3A0A16]/50 rounded">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-title text-[#CBC8C9]">Leads Recentes</h2>
              <button onClick={() => setShowLeadModal(true)} className="flex items-center bg-[#53050B] hover:bg-red-800 text-white px-3 py-1 rounded text-sm">
                <Plus className="w-4 h-4 mr-1" />
                Novo Lead
              </button>
            </div>

            {leads.length === 0 ? (
              <p className="text-center text-[#CBC8C9]/50 py-4 text-sm">Nenhum lead cadastrado</p>
            ) : (
              <div className="space-y-2">
                {leads.slice(0, 5).map((lead) => (
                  <div 
                    key={lead.id} 
                    className="flex items-center gap-2 p-2 bg-[#19161B] border border-[#3A0A16] rounded hover:border-[#53050B]/50 cursor-pointer"
                    onClick={() => setShowLeadDetail(lead)}
                  >
                    <User className="w-4 h-4 text-[#D4AF37]" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm text-[#CBC8C9] truncate">{lead.name}</h4>
                      <p className="text-xs text-[#CBC8C9]/60">{KANBAN_STAGES.find(s => s.id === lead.stage)?.label}</p>
                    </div>
                    {lead.followup_date && (
                      <Calendar className="w-4 h-4 text-yellow-500" />
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }} className="p-1 hover:bg-[#3A0A16]/50 rounded">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-4">
          <h2 className="text-xl font-title text-[#CBC8C9] mb-4">CRM - Kanban de Leads</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {KANBAN_STAGES.map((stage) => (
              <div
                key={stage.id}
                className={`${stage.color} border-2 rounded-lg p-3`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const leadId = e.dataTransfer.getData('leadId');
                  if (leadId) handleUpdateLeadStage(leadId, stage.id);
                }}
              >
                <h3 className="text-sm font-semibold mb-3 text-center">{stage.label}</h3>
                <div className="space-y-2 min-h-[200px]">
                  {leads.filter(l => l.stage === stage.id).map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
                      className="bg-[#19161B] border border-[#3A0A16] rounded p-2 cursor-move hover:border-[#53050B] transition-colors"
                    >
                      <p className="text-sm font-semibold text-[#CBC8C9]">{lead.name}</p>
                      <p className="text-xs text-[#CBC8C9]/60">{lead.phone}</p>
                      {lead.followup_date && (
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-yellow-500" />
                          <p className="text-xs text-yellow-500">{new Date(lead.followup_date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showGoalModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#19161B] border border-[#3A0A16] rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">{currentGoal ? 'Editar Meta' : 'Nova Meta Mensal'}</h3>
              <button onClick={() => { setShowGoalModal(false); setGoalForm({ monthly_target: '', current_revenue: '' }); }} className="p-1 hover:bg-[#3A0A16]/50 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Meta Mensal (R$)</label>
                <input type="number" value={goalForm.monthly_target} onChange={(e) => setGoalForm({ ...goalForm, monthly_target: e.target.value })} className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B]" placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Faturamento Atual (R$)</label>
                <input type="number" value={goalForm.current_revenue} onChange={(e) => setGoalForm({ ...goalForm, current_revenue: e.target.value })} className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B]" placeholder="15000" />
              </div>
              <button onClick={currentGoal ? handleUpdateGoal : handleCreateGoal} className="w-full bg-[#53050B] hover:bg-red-800 text-white py-3 rounded-lg">
                {currentGoal ? 'Atualizar' : 'Criar Meta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showActionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#19161B] border border-[#3A0A16] rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Nova Ação</h3>
              <button onClick={() => { setShowActionModal(false); setActionForm({ title: '', description: '' }); }} className="p-1 hover:bg-[#3A0A16]/50 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Título</label>
                <input type="text" value={actionForm.title} onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })} className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B]" placeholder="Ex: Criar 3 posts para Instagram" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
                <textarea value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B] h-24 resize-none" placeholder="Detalhes da ação..." />
              </div>
              <button onClick={handleCreateAction} disabled={!actionForm.title.trim()} className="w-full bg-[#53050B] hover:bg-red-800 text-white py-3 rounded-lg disabled:opacity-50">
                Criar Ação
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeadModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#19161B] border border-[#3A0A16] rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Novo Lead</h3>
              <button onClick={() => { setShowLeadModal(false); setLeadForm({ name: '', phone: '', stage: 'novo', notes: '', followup_date: '' }); }} className="p-1 hover:bg-[#3A0A16]/50 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome</label>
                <input type="text" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B]" placeholder="Nome do lead" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefone</label>
                <input type="tel" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B]" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Data de Follow-up</label>
                <input type="date" value={leadForm.followup_date} onChange={(e) => setLeadForm({ ...leadForm, followup_date: e.target.value })} className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Observações</label>
                <textarea value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B] h-20 resize-none" placeholder="Anotações sobre o lead..." />
              </div>
              <button onClick={handleCreateLead} disabled={!leadForm.name.trim() || !leadForm.phone.trim()} className="w-full bg-[#53050B] hover:bg-red-800 text-white py-3 rounded-lg disabled:opacity-50">
                Criar Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {showActionDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowActionDetail(null)}>
          <div className="bg-[#19161B] border border-[#3A0A16] rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[#D4AF37]">Detalhes da Ação</h3>
              <button onClick={() => setShowActionDetail(null)} className="p-1 hover:bg-[#3A0A16]/50 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#CBC8C9]/60">Título</p>
                <p className={`text-lg ${showActionDetail.completed ? 'line-through text-[#CBC8C9]/50' : 'text-[#CBC8C9]'}`}>
                  {showActionDetail.title}
                </p>
              </div>
              {showActionDetail.description && (
                <div>
                  <p className="text-sm text-[#CBC8C9]/60">Descrição</p>
                  <p className="text-[#CBC8C9] whitespace-pre-wrap">{showActionDetail.description}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <p className="text-sm text-[#CBC8C9]/60">Status:</p>
                <span className={`px-2 py-1 rounded text-xs ${showActionDetail.completed ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                  {showActionDetail.completed ? 'Concluída' : 'Pendente'}
                </span>
              </div>
              <button 
                onClick={() => { handleToggleAction(showActionDetail); setShowActionDetail(null); }} 
                className="w-full bg-[#53050B] hover:bg-red-800 text-white py-2 rounded-lg"
              >
                {showActionDetail.completed ? 'Marcar como Pendente' : 'Marcar como Concluída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeadDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowLeadDetail(null)}>
          <div className="bg-[#19161B] border border-[#3A0A16] rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[#D4AF37]">Detalhes do Lead</h3>
              <button onClick={() => setShowLeadDetail(null)} className="p-1 hover:bg-[#3A0A16]/50 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#CBC8C9]/60">Nome</p>
                <p className="text-lg text-[#CBC8C9]">{showLeadDetail.name}</p>
              </div>
              <div>
                <p className="text-sm text-[#CBC8C9]/60">Telefone</p>
                <p className="text-[#CBC8C9]">{showLeadDetail.phone}</p>
              </div>
              <div>
                <p className="text-sm text-[#CBC8C9]/60">Etapa</p>
                <span className="px-2 py-1 rounded text-xs bg-[#3A0A16] text-[#CBC8C9]">
                  {KANBAN_STAGES.find(s => s.id === showLeadDetail.stage)?.label}
                </span>
              </div>
              {showLeadDetail.followup_date && (
                <div>
                  <p className="text-sm text-[#CBC8C9]/60">Follow-up</p>
                  <p className="text-yellow-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(showLeadDetail.followup_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              {showLeadDetail.notes && (
                <div>
                  <p className="text-sm text-[#CBC8C9]/60">Observações</p>
                  <p className="text-[#CBC8C9] whitespace-pre-wrap bg-black/30 p-3 rounded">{showLeadDetail.notes}</p>
                </div>
              )}
              <button 
                onClick={() => { handleDeleteLead(showLeadDetail.id); setShowLeadDetail(null); }} 
                className="w-full bg-red-900 hover:bg-red-800 text-white py-2 rounded-lg"
              >
                Excluir Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}