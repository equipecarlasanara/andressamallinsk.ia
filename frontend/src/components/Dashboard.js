import { useState } from 'react';
import Sidebar from './Sidebar';
import EstrategistaDigital from './EstrategistaDigital';
import GoalsDashboard from './GoalsDashboard';
import ContentLibrary from './ContentLibrary';
import ProfileAnalysis from './ProfileAnalysis';
import PhotoshootCreator from './PhotoshootCreator';
import ObjectionExterminator from './ObjectionExterminator';
import SalesFunnel from './SalesFunnel';
import ImageEditor from './ImageEditor';
import PromptLibrary from './PromptLibrary';

const views = {
  estrategista: EstrategistaDigital,
  dashboard: GoalsDashboard,
  prompts: PromptLibrary,
  analise: ProfileAnalysis,
  ensaio: PhotoshootCreator,
  biblioteca: ContentLibrary,
  objecao: ObjectionExterminator,
  funil: SalesFunnel,
  editor: ImageEditor,
};

export default function Dashboard({ user, onLogout }) {
  const [active, setActive] = useState('estrategista');
  const View = views[active] || GoalsDashboard;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#080808', overflow: 'hidden' }}>
      <Sidebar active={active} setActive={setActive} user={user} onLogout={onLogout} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <View />
      </main>
    </div>
  );
}
