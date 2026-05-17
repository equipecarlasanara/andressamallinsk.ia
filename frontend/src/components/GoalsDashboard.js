import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Plus, CheckCircle, Circle, Trash2, TrendingUp, Target, Users, Edit2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STAGES = [
  { id: 'novo', label: 'Novo Lead', color: '#1E3A5F', accent: '#4A9EE0' },
  { id: 'contato', label: 'Em Contato', color: '#3A2E00', accent: '#D4A800' },
  { id: 'negociacao', label: 'Negociação', color: '#2A1A3E', accent: '#9B6FE0' },
  { id: 'fechado', label: 'Fechado', color: '#0A2E1A', accent: '#3ECF8E' },
];

function weekStart() {
  const d = new Date(); const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
}

export default function GoalsDashboard() {
  const [goal, setGoal] = useState(null);
  const [actions, setActions] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('metas');
  const [newAction, setNewAction] = useState('');
  const [editGoal, setEditGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({ monthly_target: '', current_revenue: '' });
  const [newLead, setNewLead] = useState({ name: '', phone: '', stage: 'novo' });
  const [showLeadForm, setShowLeadForm] = useState(false);

  const ws = useMemo(() => weekStart(), []);
  const month = MONTHS[new Date().getMonth()];
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    try {
      const [g, a, l] = await Promise.all([
        axios.get(`${API}/goals/current`, auth()),
        axios.get(`${API}/weekly-actions?week_start=${ws}`, auth()),
        axios.get(`${API}/leads`, auth()),
      ]);
      setGoal(g.data); setActions(Array.isArray(a.data) ? a.data : []); setLeads(Array.isArray(l.data) ? l.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ws]);

  useEffect(() => { load(); }, [load]);

  const saveGoal = async () => {
    try {
      if (goal) {
        const { data } = await axios.patch(`${API}/goals/${goal.id}`, { monthly_target: +goalForm.monthly_target, current_revenue: +goalForm.current_revenue }, auth());
        setGoal(data);
      } else {
        const { data } = await axios.post(`${API}/goals`, { monthly_target: +goalForm.monthly_target, current_revenue: +goalForm.current_revenue || 0, month, year }, auth());
        setGoal(data);
      }
      setEditGoal(false);
    } catch (e) { alert('Erro ao salvar meta.'); }
  };

  const addAction = async () => {
    if (!newAction.trim()) return;
    try {
      const { data } = await axios.post(`${API}/weekly-actions`, { title: newAction, week_start: ws }, auth());
      setActions(a => [...(Array.isArray(a) ? a : []), data]); setNewAction('');
    } catch {}
  };

  const toggleAction = async (id, done) => {
    try {
      const { data } = await axios.patch(`${API}/weekly-actions/${id}`, { completed: !done }, auth());
      setActions(a => (Array.isArray(a) ? a : []).map(x => x.id === id ? { ...x, completed: data.completed } : x));
    } catch {}
  };

  const deleteAction = async (id) => {
    try {
      await axios.delete(`${API}/weekly-actions/${id}`, auth());
      setActions(a => (Array.isArray(a) ? a : []).filter(x => x.id !== id));
    } catch {}
  };

  const addLead = async () => {
    if (!newLead.name || !newLead.phone) return;
    try {
      const { data } = await axios.post(`${API}/leads`, newLead, auth());
      setLeads(l => [...(Array.isArray(l) ? l : []), data]); setNewLead({ name: '', phone: '', stage: 'novo' }); setShowLeadForm(false);
    } catch {}
  };

  const moveLead = async (id, stage) => {
    try {
      const { data } = await axios.patch(`${API}/leads/${id}`, { stage }, auth());
      setLeads(l => l.map(x => x.id === id ? data : x));
    } catch {}
  };

  const pct = goal ? Math.min(100, Math.round((goal.current_revenue / goal.monthly_target) * 100)) : 0;
  const done = actions.filter(a => a.completed).length;

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555' }}>Carregando...</div>;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px', background: '#080808' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#E0E0E0', letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ color: '#555', fontSize: '13px', marginTop: '4px' }}>{month} {year}</p>
      </div>

      {/* Cards de métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { icon: Target, label: 'Meta do Mês', value: goal ? `R$ ${goal.monthly_target?.toLocaleString('pt-BR')}` : '—', accent: '#C0392B' },
          { icon: TrendingUp, label: 'Faturamento Atual', value: goal ? `R$ ${goal.current_revenue?.toLocaleString('pt-BR')}` : '—', accent: '#3ECF8E' },
          { icon: Users, label: 'Total de Leads', value: leads.length, accent: '#9B6FE0' },
        ].map(({ icon: Icon, label, value, accent }) => (
          <div key={label} style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Icon size={15} style={{ color: accent }} />
              <span style={{ color: '#555', fontSize: '12px' }}>{label}</span>
            </div>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#E0E0E0' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Progresso da meta */}
      {goal && (
        <div style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#888', fontSize: '13px' }}>Progresso da Meta</span>
            <span style={{ color: '#C0392B', fontWeight: '600', fontSize: '18px' }}>{pct}%</span>
          </div>
          <div style={{ height: '6px', background: '#1A1A1A', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #7A1010, #C0392B)', borderRadius: '3px', transition: 'width 0.5s' }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#111', borderRadius: '10px', padding: '4px' }}>
        {[['metas', 'Ações da Semana'], ['leads', 'CRM Leads'], ['config', 'Meta Mensal']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.15s',
              background: tab === id ? '#C0392B' : 'transparent',
              color: tab === id ? '#fff' : '#555' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Ações da semana */}
      {tab === 'metas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input value={newAction} onChange={e => setNewAction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAction()}
              placeholder="Adicionar ação da semana..." className="fire-input" style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }} />
            <button onClick={addAction} className="fire-btn" style={{ padding: '10px 16px', flexShrink: 0 }}>
              <Plus size={15} />
            </button>
          </div>
          {actions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#333', padding: '40px', fontSize: '13px' }}>
              Nenhuma ação ainda. A Estrategista pode gerar as ações da semana para você!
            </div>
          ) : actions.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#111', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '14px 16px' }}>
              <button onClick={() => toggleAction(a.id, a.completed)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: a.completed ? '#3ECF8E' : '#333', padding: 0, display: 'flex' }}>
                {a.completed ? <CheckCircle size={18} /> : <Circle size={18} />}
              </button>
              <span style={{ flex: 1, fontSize: '13px', color: a.completed ? '#444' : '#CCC', textDecoration: a.completed ? 'line-through' : 'none' }}>{a.title}</span>
              <button onClick={() => deleteAction(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', padding: 0, display: 'flex' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {actions.length > 0 && <p style={{ color: '#444', fontSize: '12px', textAlign: 'right' }}>{done}/{actions.length} concluídas</p>}
        </div>
      )}

      {/* CRM */}
      {tab === 'leads' && (
        <div>
          <button onClick={() => setShowLeadForm(!showLeadForm)} className="fire-btn" style={{ marginBottom: '16px', padding: '9px 18px', fontSize: '12px' }}>
            <Plus size={13} style={{ display: 'inline', marginRight: '6px' }} />Novo Lead
          </button>
          {showLeadForm && (
            <div style={{ background: '#111', border: '1px solid #1E0505', borderRadius: '12px', padding: '20px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input value={newLead.name} onChange={e => setNewLead(l => ({ ...l, name: e.target.value }))} placeholder="Nome" className="fire-input" style={{ flex: '1', minWidth: '150px', padding: '9px 12px', fontSize: '13px' }} />
              <input value={newLead.phone} onChange={e => setNewLead(l => ({ ...l, phone: e.target.value }))} placeholder="WhatsApp" className="fire-input" style={{ flex: '1', minWidth: '150px', padding: '9px 12px', fontSize: '13px' }} />
              <button onClick={addLead} className="fire-btn" style={{ padding: '9px 18px', fontSize: '12px' }}>Adicionar</button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {STAGES.map(({ id, label, color, accent }) => {
              const stageleads = leads.filter(l => l.stage === id);
              return (
                <div key={id} style={{ background: `${color}33`, border: `1px solid ${color}66`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: accent, fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
                    <span style={{ background: `${color}99`, color: accent, borderRadius: '20px', padding: '2px 8px', fontSize: '11px' }}>{stageleads.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stageleads.map(l => (
                      <div key={l.id} style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '8px', padding: '10px 12px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '500', color: '#CCC', marginBottom: '4px' }}>{l.name}</p>
                        <p style={{ fontSize: '11px', color: '#555' }}>{l.phone}</p>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {STAGES.filter(s => s.id !== id).map(s => (
                            <button key={s.id} onClick={() => moveLead(l.id, s.id)}
                              style={{ fontSize: '10px', padding: '3px 6px', borderRadius: '4px', border: `1px solid ${s.color}99`, background: 'transparent', color: s.accent, cursor: 'pointer' }}>
                              → {s.label.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Config meta */}
      {tab === 'config' && (
        <div style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '12px', padding: '24px', maxWidth: '400px' }}>
          <h3 style={{ color: '#E0E0E0', fontSize: '15px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit2 size={15} style={{ color: '#C0392B' }} /> Meta de {month}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Meta do Mês (R$)</label>
              <input type="number" className="fire-input" value={goalForm.monthly_target} onChange={e => setGoalForm(f => ({ ...f, monthly_target: e.target.value }))} placeholder={goal?.monthly_target || '10000'} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Faturamento Atual (R$)</label>
              <input type="number" className="fire-input" value={goalForm.current_revenue} onChange={e => setGoalForm(f => ({ ...f, current_revenue: e.target.value }))} placeholder={goal?.current_revenue || '0'} />
            </div>
            <button onClick={saveGoal} className="fire-btn" style={{ width: '100%', padding: '12px' }}>Salvar Meta</button>
          </div>
        </div>
      )}
    </div>
  );
}
