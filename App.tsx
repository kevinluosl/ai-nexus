import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { HandTracking } from './components/handtracking/HandTracking';
import { Dashboard } from './components/Dashboard';
import { DemoId } from './types';

const App: React.FC = () => {
  // Default to Hand Tracking as per user request to show it prominently, 
  // or use DASHBOARD for a cleaner landing. 
  // User asked for "Demo area on the right", implying they want to see the demo.
  const [activeDemo, setActiveDemo] = useState<DemoId>(DemoId.HAND_TRACKING);

  return (
    <div className="flex h-screen w-screen bg-black text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar activeDemo={activeDemo} onSelectDemo={setActiveDemo} />

      {/* Main Content Area */}
      <main className="flex-1 h-full relative bg-zinc-950">
        {/* Background Grid Pattern for Tech Feel */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
             style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }}>
        </div>
        
        {/* Dynamic Content */}
        <div className="relative z-10 h-full">
          {activeDemo === DemoId.HAND_TRACKING && <HandTracking />}
          {activeDemo === DemoId.DASHBOARD && <Dashboard onNavigate={setActiveDemo} />}
        </div>
      </main>
    </div>
  );
};

export default App;
