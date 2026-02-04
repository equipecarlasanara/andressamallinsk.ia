import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import GoalsDashboard from './GoalsDashboard';
import ContentLibrary from './ContentLibrary';
import EstrategistaDigital from './EstrategistaDigital';

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
        <div className={`h-full w-full ${activeView === 'biblioteca' ? 'block' : 'hidden'}`}>
          <ContentLibrary />
        </div>
        <div className={`h-full w-full ${activeView === 'estrategista' ? 'block' : 'hidden'}`}>
          <EstrategistaDigital />
        </div>
      </main>
    </div>
  );
}