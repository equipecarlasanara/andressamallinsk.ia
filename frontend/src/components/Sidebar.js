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
    <aside className="w-64 bg-[#19161B] border-r border-[#3A0A16] flex flex-col p-4" data-testid="sidebar">
      <div className="text-center py-4">
        <img
          src="/lion-profile.jpg"
          alt="Estrategista"
          className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-[#D4AF37] object-cover"
          data-testid="profile-image"
        />
        <h1 className="font-title text-3xl font-bold" style={{ color: '#D4AF37' }} data-testid="sidebar-title">
          A ESTRATEGISTA
        </h1>
        {user && (
          <p className="text-xs text-[#CBC8C9]/50 mt-2" data-testid="user-name">{user.name}</p>
        )}
      </div>

      <nav className="mt-8 flex flex-col space-y-2 flex-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${isActive
                ? 'bg-[#3A0A16] text-white'
                : 'text-[#CBC8C9]/80 hover:bg-[#3A0A16]/50 hover:text-white'
                }`}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="w-5 h-5 mr-4" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center p-3 rounded-lg text-[#CBC8C9]/80 hover:bg-[#3A0A16]/50 hover:text-white transition-colors duration-200 mt-auto"
        data-testid="logout-button"
      >
        <LogOut className="w-5 h-5 mr-4" />
        <span className="font-medium text-sm">Sair</span>
      </button>
    </aside>
  );
}
