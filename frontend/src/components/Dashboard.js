import { useState } from 'react';
import Sidebar from './Sidebar';
import GoalsDashboard from './GoalsDashboard';
import ContentLibrary from './ContentLibrary';
import EstrategistaDigital from './EstrategistaDigital';
import ProfileAnalysis from './ProfileAnalysis';
import PhotoshootCreator from './PhotoshootCreator';
import ObjectionExterminator from './ObjectionExterminator';
import ImageEditor from './ImageEditor';

export default function Dashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div className="flex h-screen bg-[#19161B] text-[#CBC8C9]" data-testid="dashboard">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        user={user}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-hidden">
        <div className={`h-full w-full ${activeView === 'dashboard' ? 'block' : 'hidden'}`}>
          <GoalsDashboard />
        </div>
        <div className={`h-full w-full ${activeView === 'estrategista' ? 'block' : 'hidden'}`}>
          <EstrategistaDigital />
        </div>
        <div className={`h-full w-full ${activeView === 'analise' ? 'block' : 'hidden'}`}>
          <ProfileAnalysis />
        </div>
        <div className={`h-full w-full ${activeView === 'ensaio' ? 'block' : 'hidden'}`}>
          <PhotoshootCreator />
        </div>
        <div className={`h-full w-full ${activeView === 'biblioteca' ? 'block' : 'hidden'}`}>
          <ContentLibrary />
        </div>
        <div className={`h-full w-full ${activeView === 'objecao' ? 'block' : 'hidden'}`}>
          <ObjectionExterminator />
        </div>
        <div className={`h-full w-full ${activeView === 'funil' ? 'block' : 'hidden'}`}>
          <div className=\"p-6 text-center\">
            <h1 className=\"text-3xl font-title text-[#CBC8C9] mb-4\">Funil de Vendas</h1>
            <p>Em desenvolvimento...</p>
          </div>
        </div>
        <div className={`h-full w-full ${activeView === 'editor' ? 'block' : 'hidden'}`}>
          <ImageEditor />
        </div>
      </main>
    </div>
  );
}
