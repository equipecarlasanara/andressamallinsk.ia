import { Target, BookOpen, Brain, LogOut, User, Camera, Shield, Edit3, TrendingUp, FileText } from 'lucide-react';

export default function Sidebar({ activeView, setActiveView, user, onLogout }) {
  const navItems = [
    { id: 'estrategista', label: 'Estrategista Digital', icon: Brain },
    { id: 'dashboard', label: 'Dashboard de Metas', icon: Target },
    { id: 'prompts', label: 'Biblioteca de Prompts', icon: FileText },
    { id: 'analise', label: 'Análise de Perfil', icon: User },
    { id: 'ensaio', label: 'Criar Ensaio Fotográfico', icon: Camera },
    { id: 'biblioteca', label: 'Biblioteca de Conteúdo', icon: BookOpen },
    { id: 'objecao', label: 'Exterminador de Objeção', icon: Shield },
    { id: 'funil', label: 'Funil de Vendas', icon: TrendingUp },
    { id: 'editor', label: 'Editor de Fotos', icon: Edit3 },
  ];

  return (
    <aside className="w-64 flex flex-col p-4 border-r border-[#1E0505]" style={{ background: '#0D0D0D' }} data-testid="sidebar">

      {/* Logo */}
      <div className="text-center py-6 flex flex-col items-center border-b border-[#1E0505] mb-4">
        <img
          src="/logo-fire-branco.png"
          alt="Estrategista Fire"
          className="w-40 mb-3"
          style={{ filter: 'drop-shadow(0 0 15px rgba(192,57,43,0.35))' }}
          data-testid="profile-image"
        />
        {user && (
          <p className="text-xs text-[#666] mt-1 tracking-wide" data-testid="user-name">
            {user.name}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="flex items-center p-3 rounded-lg transition-all duration-200 text-left group"
              style={{
                background: isActive ? 'linear-gradient(135deg, #3A0A0A, #C0392B22)' : 'transparent',
                borderLeft: isActive ? '2px solid #C0392B' : '2px solid transparent',
                color: isActive ? '#E8E8E8' : '#666',
              }}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="w-4 h-4 mr-3 flex-shrink-0" style={{ color: isActive ? '#C0392B' : '#555' }} />
              <span className="font-medium text-xs tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="flex items-center p-3 rounded-lg transition-all duration-200 mt-4 border border-[#1E0505] hover:border-[#C0392B]/30"
        style={{ color: '#555', background: 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#E8E8E8'; e.currentTarget.style.background = '#1A0505'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent'; }}
        data-testid="logout-button"
      >
        <LogOut className="w-4 h-4 mr-3" />
        <span className="font-medium text-xs tracking-wide">Sair</span>
      </button>
    </aside>
  );
}
