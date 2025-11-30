import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { HandTracking } from './components/handtracking/HandTracking';
import { Dashboard } from './components/Dashboard';
import { DemoId } from './types';

const App: React.FC = () => {
  // Default to Hand Tracking as per user request to show it prominently
  const [activeDemo, setActiveDemo] = useState<DemoId>(DemoId.HAND_TRACKING);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-black text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeDemo={activeDemo} 
        onSelectDemo={setActiveDemo} 
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <main className="flex-1 h-full relative bg-zinc-950 flex flex-col min-w-0">
        {/* Background Grid Pattern for Tech Feel */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
             style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }}>
        </div>
        
        {/* Dynamic Content */}
        <div className="relative z-10 h-full w-full">
          {activeDemo === DemoId.HAND_TRACKING && <HandTracking />}
          {activeDemo === DemoId.DASHBOARD && <Dashboard onNavigate={setActiveDemo} />}
        </div>
      </main>
    </div>
  );
};

export default App;