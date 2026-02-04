import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, DollarSign, CheckCircle, Plus, Edit2, Trash2, X } from 'lucide-react';

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

export default function GoalsDashboard() {
  const [currentGoal, setCurrentGoal] = useState(null);
  const [weeklyActions, setWeeklyActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ monthly_target: '', current_revenue: '' });
  const [actionForm, setActionForm] = useState({ title: '', description: '' });

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentMonth = monthNames[new Date().getMonth()];
  const currentYear = new Date().getFullYear();
  const weekStart = getCurrentWeekStart();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [goalRes, actionsRes] = await Promise.all([
        axios.get(`${API}/goals/current`, getAuthHeaders()),
        axios.get(`${API}/weekly-actions?week_start=${weekStart}`, getAuthHeaders())
      ]);
      setCurrentGoal(goalRes.data);
      setWeeklyActions(actionsRes.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-state">
        <p className="text-xl">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto" data-testid="goals-dashboard">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-title text-[#CBC8C9] mb-8 border-b border-[#3A0A16] pb-4" data-testid="dashboard-title">
          Dashboard de Metas
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-6" data-testid="goal-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 text-[#D4AF37] mr-3" />
                <h3 className="text-lg font-semibold">Meta Mensal</h3>
              </div>
              {currentGoal && (
                <button
                  onClick={openEditGoal}
                  className="p-2 hover:bg-[#3A0A16]/50 rounded transition-colors"
                  data-testid="edit-goal-button"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-3xl font-bold" style={{ color: '#D4AF37' }} data-testid="monthly-target">
              R$ {currentGoal?.monthly_target?.toLocaleString('pt-BR') || '0,00'}
            </p>
            <p className="text-sm text-[#CBC8C9]/70 mt-2">{currentMonth} {currentYear}</p>
            {!currentGoal && (
              <button
                onClick={() => setShowGoalModal(true)}
                className="mt-4 w-full bg-[#53050B] hover:bg-red-800 text-white py-2 rounded-lg transition-colors"
                data-testid="create-goal-button"
              >
                Definir Meta
              </button>
            )}
          </div>

          <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-6" data-testid="revenue-card">
            <div className="flex items-center mb-4">
              <DollarSign className="w-6 h-6 text-green-500 mr-3" />
              <h3 className="text-lg font-semibold">Faturamento Atual</h3>
            </div>
            <p className="text-3xl font-bold text-green-500" data-testid="current-revenue">
              R$ {currentGoal?.current_revenue?.toLocaleString('pt-BR') || '0,00'}
            </p>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Progresso</span>
                <span data-testid="progress-percentage">{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[#19161B] rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                  data-testid="progress-bar"
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-6" data-testid="actions-summary-card">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-6 h-6 text-[#D4AF37] mr-3" />
              <h3 className="text-lg font-semibold">Ações Concluídas</h3>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#D4AF37' }} data-testid="completed-actions-count">
              {weeklyActions.filter(a => a.completed).length} / {weeklyActions.length}
            </p>
            <p className="text-sm text-[#CBC8C9]/70 mt-2">Esta semana</p>
          </div>
        </div>

        <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-6" data-testid="weekly-actions-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-title text-[#CBC8C9]">Ações da Semana</h2>
            <button
              onClick={() => setShowActionModal(true)}
              className="flex items-center bg-[#53050B] hover:bg-red-800 text-white px-4 py-2 rounded-lg transition-colors"
              data-testid="add-action-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Ação
            </button>
          </div>

          {weeklyActions.length === 0 ? (
            <p className="text-center text-[#CBC8C9]/50 py-8" data-testid="no-actions-message">
              Nenhuma ação cadastrada para esta semana
            </p>
          ) : (
            <div className="space-y-3">
              {weeklyActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-4 p-4 bg-[#19161B] border border-[#3A0A16] rounded-lg hover:border-[#53050B]/50 transition-colors"
                  data-testid={`action-item-${action.id}`}
                >
                  <button
                    onClick={() => handleToggleAction(action)}
                    className="mt-1"
                    data-testid={`action-checkbox-${action.id}`}
                  >
                    {action.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-[#3A0A16] rounded-full"></div>
                    )}
                  </button>
                  <div className="flex-1">
                    <h4
                      className={`font-semibold ${
                        action.completed ? 'line-through text-[#CBC8C9]/50' : 'text-[#CBC8C9]'
                      }`}
                      data-testid={`action-title-${action.id}`}
                    >
                      {action.title}
                    </h4>
                    {action.description && (
                      <p className="text-sm text-[#CBC8C9]/70 mt-1" data-testid={`action-description-${action.id}`}>
                        {action.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteAction(action.id)}
                    className="p-2 hover:bg-[#3A0A16]/50 rounded transition-colors"
                    data-testid={`delete-action-${action.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showGoalModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" data-testid="goal-modal">
          <div className="bg-[#19161B] border border-[#3A0A16] rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {currentGoal ? 'Editar Meta' : 'Nova Meta Mensal'}
              </h3>
              <button
                onClick={() => {
                  setShowGoalModal(false);
                  setGoalForm({ monthly_target: '', current_revenue: '' });
                }}
                className="p-1 hover:bg-[#3A0A16]/50 rounded"
                data-testid="close-goal-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Meta Mensal (R$)</label>
                <input
                  type="number"
                  value={goalForm.monthly_target}
                  onChange={(e) => setGoalForm({ ...goalForm, monthly_target: e.target.value })}
                  className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B]"
                  placeholder="10000"
                  data-testid="goal-target-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Faturamento Atual (R$)</label>
                <input
                  type="number"
                  value={goalForm.current_revenue}
                  onChange={(e) => setGoalForm({ ...goalForm, current_revenue: e.target.value })}
                  className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B]"
                  placeholder="5000"
                  data-testid="goal-revenue-input"
                />
              </div>
              <button
                onClick={currentGoal ? handleUpdateGoal : handleCreateGoal}
                className="w-full bg-[#53050B] hover:bg-red-800 text-white py-3 rounded-lg transition-colors"
                data-testid="save-goal-button"
              >
                {currentGoal ? 'Atualizar' : 'Criar Meta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showActionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" data-testid="action-modal">
          <div className="bg-[#19161B] border border-[#3A0A16] rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Nova Ação</h3>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionForm({ title: '', description: '' });
                }}
                className="p-1 hover:bg-[#3A0A16]/50 rounded"
                data-testid="close-action-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Título</label>
                <input
                  type="text"
                  value={actionForm.title}
                  onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                  className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B]"
                  placeholder="Ex: Criar 3 posts para Instagram"
                  data-testid="action-title-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
                <textarea
                  value={actionForm.description}
                  onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                  className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B] h-24 resize-none"
                  placeholder="Detalhes da ação..."
                  data-testid="action-description-input"
                />
              </div>
              <button
                onClick={handleCreateAction}
                disabled={!actionForm.title.trim()}
                className="w-full bg-[#53050B] hover:bg-red-800 text-white py-3 rounded-lg transition-colors disabled:opacity-50"
                data-testid="save-action-button"
              >
                Criar Ação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}