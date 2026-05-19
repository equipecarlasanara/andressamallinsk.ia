import { Brain, Target, FileText, User, Camera, BookOpen, Shield, TrendingUp, Edit3, LogOut } from 'lucide-react';

const nav = [
  { id: 'estrategista', label: 'Estrategista Digital', icon: Brain },
  { id: 'dashboard', label: 'Dashboard de Metas', icon: Target },
  { id: 'prompts', label: 'Biblioteca de Prompts', icon: FileText },
  { id: 'analise', label: 'Análise de Perfil', icon: User },
  { id: 'ensaio', label: 'Criar Ensaio', icon: Camera },
  { id: 'biblioteca', label: 'Biblioteca de Conteúdo', icon: BookOpen },
  { id: 'objecao', label: 'Exterminador de Objeção', icon: Shield },
  { id: 'funil', label: 'Funil de Vendas', icon: TrendingUp },
  { id: 'editor', label: 'Editor de Fotos', icon: Edit3 },
];

export default function Sidebar({ active, setActive, user, onLogout }) {
  return (
    <aside style={{ width: '220px', background: '#0C0C0C', borderRight: '1px solid #1A0505', display: 'flex', flexDirection: 'column', padding: '20px 12px', flexShrink: 0 }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', paddingBottom: '20px', borderBottom: '1px solid #1A0505', marginBottom: '16px' }}>
        <img src="/logo-fire-preto.png" alt="Estrategista Fire"
          style={{ width: '100px', filter: 'drop-shadow(0 0 15px rgba(192,57,43,0.6)) invert(1)', mixBlendMode: 'screen' }} />
        {user && <p style={{ color: '#444', fontSize: '11px', marginTop: '8px', letterSpacing: '0.05em' }}>{user.name}</p>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {nav.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => setActive(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                background: isActive ? 'linear-gradient(135deg, #2A0808, rgba(192,57,43,0.15))' : 'transparent',
                borderLeft: isActive ? '2px solid #C0392B' : '2px solid transparent',
                color: isActive ? '#E0E0E0' : '#555',
                fontSize: '12px', fontWeight: isActive ? '500' : '400', letterSpacing: '0.02em',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = '#999'; e.currentTarget.style.background = '#141414'; }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent'; }}}
            >
              <Icon size={14} style={{ color: isActive ? '#C0392B' : '#444', flexShrink: 0 }} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <button onClick={onLogout}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1A0505', background: 'transparent', color: '#444', fontSize: '12px', cursor: 'pointer', marginTop: '8px', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#E0E0E0'; e.currentTarget.style.background = '#1A0505'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.background = 'transparent'; }}
      >
        <LogOut size={14} /> Sair
      </button>
    </aside>
  );
}
